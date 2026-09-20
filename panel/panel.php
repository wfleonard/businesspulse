<?php
declare(strict_types=1);

/**
 * Saxon AEO — Visibility Panel
 *
 *   php panel.php run     eastcoastutility [--limit=10] [--concurrency=4] [--category=cost]
 *   php panel.php report  eastcoastutility [--run=3] [--html=out/audit.html]
 *   php panel.php runs
 *   php panel.php queries eastcoastutility
 *   php panel.php job     --in=job.json --out=result.json
 */

namespace Saxon\Panel;

use Saxon\Panel\Engines\ClaudeEngine;
use Saxon\Panel\Engines\Engine;
use Saxon\Panel\Engines\GeminiEngine;
use Saxon\Panel\Engines\OpenAIEngine;
use Saxon\Panel\Engines\PerplexityEngine;

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'Saxon\\Panel\\')) { return; }
    $rel  = str_replace('\\', '/', substr($class, strlen('Saxon\\Panel\\')));
    $file = __DIR__ . '/src/' . $rel . '.php';
    if (is_file($file)) { require $file; }
});

const ROOT = __DIR__;

/**
 * Where client profiles (clients/), runs (data/) and reports (out/) live.
 * Defaults to this folder. SaxonAEO's ./panel wrapper points it at
 * SaxonAEO/visibility-panel, so local audits keep their own data while the
 * engine code lives only here.
 */
define(__NAMESPACE__ . '\PANEL_HOME', rtrim((string) (getenv('PANEL_HOME') ?: ROOT), '/'));
define(__NAMESPACE__ . '\DB_PATH', PANEL_HOME . '/data/panel.sqlite');

/**
 * Tries per query, including the first. Perplexity's rate limit outlasts a short
 * backoff: at 3 tries (retries after 6s and 12s) a live 20-question snapshot
 * lost 13 answers to HTTP 429.
 *
 * Top-level constants exist only once their line has run, so this must stay
 * above the command dispatch below; defined next to runPanel() it was undefined
 * when `job` retried and crashed the panel.
 */
const MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------- arg parsing

$argvCopy = $argv;
array_shift($argvCopy);
$command = array_shift($argvCopy) ?: 'help';

$positional = [];
$opts = [];
foreach ($argvCopy as $arg) {
    if (str_starts_with($arg, '--')) {
        [$k, $v] = array_pad(explode('=', substr($arg, 2), 2), 2, true);
        $opts[$k] = $v;
    } else {
        $positional[] = $arg;
    }
}

/** Default model per engine — overridable with --model. */
const ENGINE_DEFAULTS = [
    'claude'     => 'claude-sonnet-5',
    'gemini'     => 'gemini-3.8-flash',
    'openai'     => 'gpt-5.6-terra',
    'perplexity' => 'sonar',
];

function makeEngine(string $engine, array $opts): Engine
{
    $model  = (string) ($opts['model'] ?? ENGINE_DEFAULTS[$engine] ?? '');
    $effort = (string) ($opts['effort'] ?? 'medium');

    return match ($engine) {
        'claude'     => new ClaudeEngine($model, 5, $effort),
        // --effort carries over: Gemini calls it thinking_level and adds
        // "minimal" below "low", but low/medium/high mean the same thing.
        'gemini'     => new GeminiEngine($model, $effort),
        'openai'     => new OpenAIEngine($model, (string) ($opts['context'] ?? 'medium')),
        'perplexity' => new PerplexityEngine($model),
        default      => (static function () use ($engine): never {
            fwrite(STDERR, "Unknown engine '$engine'. Available: "
                . implode(', ', array_keys(ENGINE_DEFAULTS)) . "\n");
            exit(1);
        })(),
    };
}

function loadClient(string $slug): array
{
    $path = PANEL_HOME . '/clients/' . basename($slug) . '.json';
    if (!is_file($path)) {
        fwrite(STDERR, "No client profile at $path\n");
        exit(1);
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        fwrite(STDERR, "Invalid JSON in $path\n");
        exit(1);
    }
    return $data;
}

// -------------------------------------------------------------------- command

switch ($command) {

case 'run': {
    $slug = $positional[0] ?? '';
    if ($slug === '') { fwrite(STDERR, "usage: php panel.php run <client>\n"); exit(1); }

    $client = loadClient($slug);
    $panel  = $client['query_panel'] ?? [];

    if (isset($opts['category']) && $opts['category'] !== true) {
        $wanted = explode(',', (string) $opts['category']);
        $panel = array_values(array_filter($panel, fn($q) => in_array($q['c'] ?? '', $wanted, true)));
    }
    if (isset($opts['limit'])) {
        $panel = array_slice($panel, 0, max(1, (int) $opts['limit']));
    }
    if (!$panel) { fwrite(STDERR, "No queries selected.\n"); exit(1); }

    $concurrency = max(1, (int) ($opts['concurrency'] ?? 4));

    // --engine=claude,perplexity runs the panel once per engine, one run row each.
    $engineNames = array_values(array_filter(array_map(
        'trim', explode(',', (string) ($opts['engine'] ?? 'claude')))));

    // Validate before anything else so --dry-run catches a typo too.
    foreach ($engineNames as $en) {
        if (!isset(ENGINE_DEFAULTS[$en])) {
            fwrite(STDERR, "Unknown engine '$en'. Available: "
                . implode(', ', array_keys(ENGINE_DEFAULTS)) . "\n");
            exit(1);
        }
    }

    if (isset($opts['dry-run'])) {
        printf("Would run %d queries against %s at concurrency %d.\n",
            count($panel), implode(' + ', $engineNames), $concurrency);
        foreach ($panel as $i => $q) { printf("  %3d. [%-16s] %s\n", $i + 1, $q['c'], $q['q']); }
        exit(0);
    }

    // Construct every engine BEFORE running any of them. Each constructor
    // validates its API key, so a missing key fails now — for free — instead of
    // after an earlier engine has already spent real money on a full pass.
    $engines = [];
    foreach ($engineNames as $engineName) {
        // --model applies only when a single engine is named; otherwise each
        // engine takes its own default (models are not interchangeable).
        $engineOpts = count($engineNames) === 1 ? $opts : array_diff_key($opts, ['model' => null]);
        $engines[] = makeEngine($engineName, $engineOpts);
    }

    $analyzer = new Analyzer($client);
    $db       = new Db(DB_PATH);
    $runIds   = [];
    $grand    = 0.0;

    foreach ($engines as $engine) {
        $runId = $db->startRun($client['slug'], $engine->name(), $engine->model());
        $runIds[] = $runId;

        printf("Run #%d — %s · %d queries · %s/%s · concurrency %d\n\n",
            $runId, $client['name'], count($panel),
            $engine->name(), $engine->model(), $concurrency);

        $stats = runPanel($engine, $analyzer,
            fn(array $row) => $db->saveResult($runId, $row), $panel, $concurrency);
        $db->finishRun($runId, $stats['ok'], $stats['errors'], $stats['cost']);
        $grand += $stats['cost'];

        printf("\n  %d answered, %d errors, est. $%.2f\n\n",
            $stats['ok'], $stats['errors'], $stats['cost']);
    }

    printf("Done. Runs %s · total est. $%.2f\n", implode(',', $runIds), $grand);
    printf("Report:  php panel.php report %s --runs=%s --html=out/%s-%s.html\n",
        $client['slug'], implode(',', $runIds), $client['slug'], date('Y-m-d'));
    break;
}

/**
 * Re-run only the queries that errored in an existing run, writing the answers
 * back into that same run.
 *
 * Runs fail in the middle for reasons that have nothing to do with the panel:
 * exhausted credits, a provider rate limit, a network blip. Re-running the whole
 * client from scratch pays a second time for every answer that already
 * succeeded — on a 124-query Claude panel that is most of the cost.
 *
 * Results land in the ORIGINAL run row rather than a new one, which is what
 * keeps reporting simple: the run becomes complete, `latestRunPerEngine` still
 * picks it, and no caller has to know a retry happened. The alternative — a
 * second run row — would silently drop the first run's good answers from the
 * default report, since only the latest run per engine is used.
 */
case 'retry': {
    $runId = (int) ($positional[0] ?? 0);
    if ($runId <= 0) {
        fwrite(STDERR, "usage: php panel.php retry <run-id> [--concurrency=N]\n");
        exit(1);
    }

    $db  = new Db(DB_PATH);
    $run = $db->run($runId);
    if (!$run) { fwrite(STDERR, "No run #$runId.\n"); exit(1); }

    $failed = $db->erroredResults($runId);
    if (!$failed) {
        printf("Run #%d (%s/%s) has no failed queries. Nothing to do.\n",
            $runId, $run['client'], $run['engine']);
        break;
    }

    $client = loadClient($run['client']);

    // The run's own model, not the current default and not --model. Mixing
    // models inside one run would make its per-engine rate meaningless.
    $engine = makeEngine($run['engine'], ['model' => $run['model']] + $opts);

    $panel = array_map(
        fn(array $r) => ['q' => $r['query'], 'c' => $r['category']],
        $failed
    );
    $concurrency = max(1, (int) ($opts['concurrency'] ?? 4));

    // Group the failures by cause — one rate limit and one dead key look
    // identical in a count, and they call for very different next steps.
    $causes = [];
    foreach ($failed as $r) { $causes[substr((string) $r['error'], 0, 60)] ??= 0; }
    foreach ($failed as $r) { $causes[substr((string) $r['error'], 0, 60)]++; }

    printf("Run #%d — %s · %s/%s\n", $runId, $client['name'], $run['engine'], $run['model']);
    printf("%d failed queries to retry:\n", count($failed));
    foreach ($causes as $cause => $n) { printf("  %3d x %s\n", $n, $cause); }
    echo "\n";

    if (isset($opts['dry-run'])) {
        foreach ($panel as $i => $q) { printf("  %3d. [%-16s] %s\n", $i + 1, $q['c'], $q['q']); }
        printf("\nWould retry %d queries at concurrency %d. No API calls made.\n",
            count($panel), $concurrency);
        break;
    }

    // Delete before re-running: runPanel INSERTs, so the stale error rows have
    // to go or the run ends up with two rows per query.
    $db->deleteResults(array_column($failed, 'id'));

    $stats = runPanel($engine, new Analyzer($client),
        fn(array $row) => $db->saveResult($runId, $row), $panel, $concurrency);
    $db->recountRun($runId, $stats['cost']);

    $after = $db->run($runId);
    printf("\n  %d answered, %d errors, est. $%.2f this pass\n",
        $stats['ok'], $stats['errors'], $stats['cost']);
    printf("  Run #%d now: %d answered, %d errors, $%.2f total\n\n",
        $runId, (int) $after['query_count'], (int) $after['error_count'],
        (float) $after['cost_usd']);

    if ((int) $after['error_count'] > 0) {
        printf("Still failing — run `php panel.php retry %d` again once the cause is cleared.\n", $runId);
    } else {
        printf("Report:  php panel.php report %s --html=out/%s-%s.html\n",
            $run['client'], $run['client'], date('Y-m-d'));
    }
    break;
}

case 'report': {
    $slug = $positional[0] ?? '';
    if ($slug === '') { fwrite(STDERR, "usage: php panel.php report <client>\n"); exit(1); }

    $client = loadClient($slug);
    $db     = new Db(DB_PATH);

    // --runs=1,2 for an explicit set; --run=N for one; default is the latest
    // run of every engine, so the audit covers all assistants without asking.
    if (isset($opts['runs']) && $opts['runs'] !== true) {
        $runIds = array_map('intval', explode(',', (string) $opts['runs']));
    } elseif (isset($opts['run'])) {
        $runIds = [(int) $opts['run']];
    } else {
        $runIds = $db->latestRunPerEngine($client['slug']);
    }

    $runs = $db->runs($runIds);
    if (!$runs) {
        fwrite(STDERR, "No completed runs found for {$client['slug']}.\n");
        exit(1);
    }

    $report = new Report(
        $client, $runs,
        $db->resultsForRuns(array_column($runs, 'id')),
        $db->history($client['slug'])
    );
    echo $report->console();

    if (isset($opts['html'])) {
        $path = $opts['html'] === true
            ? PANEL_HOME . "/out/{$client['slug']}-" . date('Y-m-d') . '.html'
            : (str_starts_with((string) $opts['html'], '/') ? $opts['html'] : PANEL_HOME . '/' . $opts['html']);
        if (!is_dir(dirname($path))) { mkdir(dirname($path), 0775, true); }
        file_put_contents($path, $report->html());
        printf("  HTML audit written to %s\n", $path);
        printf("  Open it, print to PDF, attach to the outreach email.\n\n");
    }
    break;
}

case 'reclassify': {
    // Re-run the Analyzer over stored answers after editing a client's
    // directory_domains / reference_domains. Costs nothing — the raw engine
    // responses are kept, so tuning what counts as a competitor never means
    // re-spending on the API.
    $client = loadClient($positional[0] ?? '');
    $db     = new Db(DB_PATH);
    $an     = new Analyzer($client);

    $rows = $db->resultsForClient($client['slug']);
    $changed = 0;

    foreach ($rows as $row) {
        $v = $an->analyze([
            'answer'  => $row['answer'] ?? '',
            'sources' => json_decode($row['sources_json'] ?: '[]', true) ?: [],
        ]);
        $db->updateVerdict((int) $row['id'], $v);
        $changed++;
    }

    printf("Re-analyzed %d stored results for %s. No API calls, no cost.\n",
        $changed, $client['name']);
    printf("Regenerate:  php panel.php report %s --html=out/%s-audit.html\n",
        $client['slug'], $client['slug']);
    break;
}

case 'models': {
    // Model IDs drift faster than docs do. Ask the provider directly rather
    // than trusting a hardcoded default.
    $engine = (string) ($opts['engine'] ?? 'openai');
    if ($engine !== 'openai') {
        fwrite(STDERR, "models is only implemented for --engine=openai.\n"
            . "  claude:     see shared/models.md or GET /v1/models\n"
            . "  gemini:     ai.google.dev/gemini-api/docs/models — grounding needs a Gemini 3.x model\n"
            . "  perplexity: sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research\n");
        exit(1);
    }

    $res = (new OpenAIEngine())->listModels();
    if (isset($res['error'])) { fwrite(STDERR, $res['error'] . "\n"); exit(1); }

    $filter = isset($opts['filter']) && $opts['filter'] !== true ? (string) $opts['filter'] : 'gpt';
    $models = array_values(array_filter($res['models'], fn($m) => str_contains($m, $filter)));
    sort($models);

    printf("%d model%s matching '%s' (of %d total):\n\n",
        count($models), count($models) === 1 ? '' : 's', $filter, count($res['models']));
    foreach ($models as $m) { echo "  $m\n"; }
    echo "\nUse one with:  php panel.php run <client> --engine=openai --model=<id>\n";
    break;
}

case 'runs': {
    $db = new Db(DB_PATH);
    printf("%-5s %-20s %-9s %-18s %-22s %6s %8s\n",
        'ID', 'CLIENT', 'ENGINE', 'MODEL', 'STARTED', 'N', 'COST');
    foreach ($db->listRuns() as $r) {
        printf("%-5d %-20s %-9s %-18s %-22s %6d %8s\n",
            $r['id'], $r['client'], $r['engine'], $r['model'],
            substr((string) $r['started_at'], 0, 19),
            $r['query_count'], '$' . number_format((float) $r['cost_usd'], 2));
    }
    break;
}

case 'queries': {
    $client = loadClient($positional[0] ?? '');
    $byCat = [];
    foreach ($client['query_panel'] as $q) { $byCat[$q['c']][] = $q['q']; }
    foreach ($byCat as $cat => $qs) {
        printf("\n%s (%d)\n%s\n", strtoupper($cat), count($qs), str_repeat('-', 60));
        foreach ($qs as $q) { echo "  $q\n"; }
    }
    printf("\nTotal: %d queries\n", count($client['query_panel']));
    break;
}

/**
 * Run a job file and write a result file — the BusinessPulse worker's entry point.
 *
 * No SQLite: the caller owns storage. Per-question failures are recorded in the
 * result rather than thrown. Only a fatal problem exits non-zero:
 *   2  bad invocation or invalid job file (nothing was spent)
 *   1  missing API key or the result could not be written
 */
case 'job': {
    $in  = is_string($opts['in'] ?? null) ? $opts['in'] : '';
    $out = is_string($opts['out'] ?? null) ? $opts['out'] : '';
    if ($in === '' || $out === '') {
        fwrite(STDERR, "usage: php panel.php job --in=<job.json> --out=<result.json>\n");
        exit(2);
    }

    try {
        $job = Job::load($in, array_keys(ENGINE_DEFAULTS));
    } catch (\InvalidArgumentException $e) {
        fwrite(STDERR, "Invalid job file: {$e->getMessage()}\n");
        exit(2);
    }

    // Construct every engine first so a missing key fails before any spend.
    $engines = [];
    foreach ($job['engines'] as $engineName) {
        $engines[] = makeEngine($engineName,
            isset($job['models'][$engineName]) ? ['model' => $job['models'][$engineName]] : []);
    }

    $analyzer = new Analyzer(Job::analyzerProfile($job['client']));
    $started  = gmdate('c');
    $rows     = [];

    foreach ($engines as $engine) {
        printf("%s · %d questions · %s/%s\n",
            $job['client']['domain'], count($job['questions']), $engine->name(), $engine->model());

        runPanel($engine, $analyzer,
            function (array $row) use (&$rows, $engine): void {
                $rows[] = ['engine' => $engine->name(), 'model' => $engine->model()] + $row;
            },
            $job['questions'], $job['concurrency']);
    }

    try {
        Job::write($out, Job::result($job, $rows, $started, gmdate('c')));
    } catch (\RuntimeException | \JsonException $e) {
        fwrite(STDERR, "Could not write result: {$e->getMessage()}\n");
        exit(1);
    }

    printf("Result written to %s\n", $out);
    break;
}

default:
    echo <<<TXT

    Saxon AEO — Visibility Panel

      php panel.php run <client> [options]
          --engine=a,b       claude | gemini | openai | perplexity, comma-separated
                             (default claude; one run row per engine)
          --limit=N          only the first N queries (use for a cheap smoke test)
          --category=a,b     restrict to intent categories
          --concurrency=N    parallel requests (default 4)
          --model=ID         only when a single engine is named
          --effort=LEVEL     low|medium|high  (claude and gemini, default medium)
          --context=SIZE     low|medium|high  (openai search depth, default medium)
          --dry-run          print the query plan and exit, no API calls

      php panel.php retry <run-id> [--concurrency=N] [--dry-run]
          re-run only the queries that errored, into the same run.
          Keeps the run's original model. Use after clearing the cause
          (topped up credits, lower concurrency for a rate limit).

      php panel.php report <client> [--runs=1,2 | --run=ID] [--html=path]
          with no run flag, uses the latest run of every engine

      php panel.php models --engine=openai [--filter=gpt]
          list model IDs your key can actually reach

      php panel.php job --in=<job.json> --out=<result.json>
          run a job file and write a result file — no SQLite.
          The BusinessPulse worker's entry point; see README.md.

    Keys:  ANTHROPIC_API_KEY   GEMINI_API_KEY   OPENAI_API_KEY   PERPLEXITY_API_KEY
      php panel.php runs
      php panel.php queries <client>


    TXT;
}

// ---------------------------------------------------------------- the runner

/**
 * Drives the panel with curl_multi so a 116-query run takes minutes, not an hour.
 * Retries genuinely transient 429/5xx up to four times with growing backoff —
 * over a full panel you will hit both — while failing fast on permanent errors
 * (see above).
 *
 * Every finished query — answered or failed — is handed to $onResult as one
 * normalized row. The runner owns no storage: `run` and `retry` save rows to
 * SQLite, `job` collects them into a result file.
 */
function runPanel(
    Engine $engine, Analyzer $analyzer, callable $onResult,
    array $panel, int $concurrency
): array {
    $queue   = array_values($panel);
    $mh      = curl_multi_init();
    $inFlight = [];               // (int) handle id => context
    $ok = 0; $errors = 0; $cost = 0.0; $done = 0;
    $total = count($queue);
    $retryAfter = [];             // handle id => unix ts to resubmit

    $launch = static function (array $item, int $attempt) use ($engine, $mh, &$inFlight): void {
        $ch = $engine->prepare($item['q']);
        curl_multi_add_handle($mh, $ch);
        $inFlight[spl_object_id($ch)] = ['ch' => $ch, 'item' => $item, 'attempt' => $attempt];
    };

    $pending = [];  // items waiting on backoff: [ts, item, attempt]

    while ($queue || $inFlight || $pending) {

        // Promote any backed-off items whose wait has elapsed.
        foreach ($pending as $k => [$ts, $item, $attempt]) {
            if ($ts <= time()) { $launch($item, $attempt); unset($pending[$k]); }
        }

        while ($queue && count($inFlight) < $concurrency) {
            $launch(array_shift($queue), 1);
        }

        if (!$inFlight) {
            if ($pending) { usleep(300_000); continue; }
            break;
        }

        do { $status = curl_multi_exec($mh, $active); }
        while ($status === CURLM_CALL_MULTI_PERFORM);
        if ($active) { curl_multi_select($mh, 1.0); }

        while ($info = curl_multi_info_read($mh)) {
            $ch  = $info['handle'];
            $id  = spl_object_id($ch);
            $ctx = $inFlight[$id] ?? null;
            unset($inFlight[$id]);

            $body   = (string) curl_multi_getcontent($ch);
            $http   = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlNo = $info['result'];
            // No curl_close() — deprecated as of PHP 8.5 and a no-op since 8.0.
            curl_multi_remove_handle($mh, $ch);

            if (!$ctx) { continue; }
            $item = $ctx['item'];

            // Transient failure -> back off and requeue (up to MAX_ATTEMPTS tries).
            // But a 429 can mean two very different things: "slow down" (retry)
            // or "you are out of credits" (retrying just wastes 20 minutes).
            $transient = ($curlNo !== CURLE_OK || $http === 429 || $http >= 500)
                       && !Retry::isPermanentFailure($body);
            if ($transient && $ctx['attempt'] < MAX_ATTEMPTS) {
                // 6s, 12s, 24s, 48s, plus jitter so throttled requests don't all return at once.
                $wait = 2 ** $ctx['attempt'] * 3 + random_int(0, 3);
                $pending[] = [time() + $wait, $item, $ctx['attempt'] + 1];
                printf("  [retry %ds] %s\n", $wait, mb_strimwidth($item['q'], 0, 50, '…'));
                continue;
            }

            $done++;

            if ($curlNo !== CURLE_OK) {
                $parsed = ['answer' => '', 'sources' => [], 'input_tokens' => 0,
                           'output_tokens' => 0, 'searches' => 0,
                           'error' => 'curl: ' . curl_strerror($curlNo)];
            } else {
                $parsed = $engine->parse($body, $http);
            }

            if ($parsed['error']) {
                $errors++;
                $onResult([
                    'query'          => $item['q'],
                    'category'       => $item['c'],
                    'answer'         => '',
                    'sources'        => [],
                    'rivals'         => [],
                    'own_cited'      => false,
                    'own_rank'       => null,
                    'name_mentioned' => false,
                    'directory_only' => false,
                    'input_tokens'   => $parsed['input_tokens'],
                    'output_tokens'  => $parsed['output_tokens'],
                    'searches'       => $parsed['searches'],
                    'cost_usd'       => 0.0,
                    'error'          => $parsed['error'],
                ]);
                printf("  [%3d/%3d] ERR  %-46s %s\n", $done, $total,
                    mb_strimwidth($item['q'], 0, 46, '…'),
                    mb_strimwidth($parsed['error'], 0, 40, '…'));
                continue;
            }

            $verdict = $analyzer->analyze($parsed);
            $rowCost = $engine->costOf($parsed);
            $cost   += $rowCost;
            $ok++;

            $onResult([
                'query'         => $item['q'],
                'category'      => $item['c'],
                'answer'        => $parsed['answer'],
                'sources'       => $parsed['sources'],
                'input_tokens'  => $parsed['input_tokens'],
                'output_tokens' => $parsed['output_tokens'],
                'searches'      => $parsed['searches'],
                'cost_usd'      => $rowCost,
                'error'         => null,
            ] + $verdict);

            $mark = $verdict['own_cited'] ? 'CITED'
                  : ($verdict['name_mentioned'] ? 'named'
                  : ($verdict['directory_only'] ? ' dir ' : '  -  '));

            printf("  [%3d/%3d] %-5s %-46s %d src\n", $done, $total, $mark,
                mb_strimwidth($item['q'], 0, 46, '…'), count($parsed['sources']));
        }
    }

    curl_multi_close($mh);
    return ['ok' => $ok, 'errors' => $errors, 'cost' => $cost];
}
