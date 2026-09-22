<?php
declare(strict_types=1);

/**
 * Offline tests for the job contract — no API keys, no network, no spend.
 *
 *   php tests/job.php
 */

namespace Saxon\Panel;

$root = dirname(__DIR__);
spl_autoload_register(static function (string $c) use ($root): void {
    if (!str_starts_with($c, 'Saxon\\Panel\\')) { return; }
    $f = $root . '/src/' . str_replace('\\', '/', substr($c, 12)) . '.php';
    if (is_file($f)) { require $f; }
});

$pass = 0; $fail = 0;
$check = function (string $label, $actual, $expected) use (&$pass, &$fail): void {
    $ok = $actual === $expected;
    $ok ? $pass++ : $fail++;
    printf("  %s %-56s %s\n", $ok ? 'ok  ' : 'FAIL',
        $label, $ok ? '' : 'got ' . var_export($actual, true)
                          . ', want ' . var_export($expected, true));
};

/** Message of the InvalidArgumentException thrown by $fn, or null if none. */
$throws = function (callable $fn): ?string {
    try {
        $fn();
        return null;
    } catch (\InvalidArgumentException $e) {
        return $e->getMessage();
    }
};

$engines = ['claude', 'openai', 'perplexity'];

$valid = [
    'client'    => ['name' => 'East Coast Utility, LLC', 'domain' => 'https://www.EastCoastUtility.com/about?x=1'],
    'questions' => [['q' => '  who does HDD in NJ  '], ['c' => 'cost', 'q' => 'HDD cost per foot']],
    'engines'   => ['perplexity', 'perplexity'],
];

$tmpDir = sys_get_temp_dir() . '/panel-job-test-' . bin2hex(random_bytes(4));
mkdir($tmpDir);

// ---------------------------------------------------------------------------
echo "\nJob normalization\n";
$j = Job::normalize($valid, $engines);
$check('domain normalized', $j['client']['domain'], 'eastcoastutility.com');
$check('question text trimmed', $j['questions'][0]['q'], 'who does HDD in NJ');
$check('missing category defaults', $j['questions'][0]['c'], 'uncategorized');
$check('category kept', $j['questions'][1]['c'], 'cost');
$check('duplicate engines collapsed', $j['engines'], ['perplexity']);
$check('concurrency defaults to 4', $j['concurrency'], 4);
$check('concurrency capped at 10', Job::normalize(['concurrency' => 50] + $valid, $engines)['concurrency'], 10);
$check('concurrency floored at 1', Job::normalize(['concurrency' => 0] + $valid, $engines)['concurrency'], 1);
$check('domain lists default to empty', $j['client']['directory_domains'], []);
$check('per-engine model kept',
    Job::normalize(['models' => ['perplexity' => 'sonar-pro']] + $valid, $engines)['models'],
    ['perplexity' => 'sonar-pro']);

// ---------------------------------------------------------------------------
echo "\nJob validation\n";
$bad = [
    'missing client'        => ['client' => null] + $valid,
    'missing name'          => ['client' => ['domain' => 'eastcoastutility.com']] + $valid,
    'missing domain'        => ['client' => ['name' => 'A Co']] + $valid,
    'domain without a dot'  => ['client' => ['name' => 'A Co', 'domain' => 'localhost']] + $valid,
    'domain with spaces'    => ['client' => ['name' => 'A Co', 'domain' => 'not a domain.com']] + $valid,
    'empty questions'       => ['questions' => []] + $valid,
    'question without text' => ['questions' => [['c' => 'cost']]] + $valid,
    'no engines'            => ['engines' => []] + $valid,
    'unknown engine'        => ['engines' => ['bard']] + $valid,
];
foreach ($bad as $label => $data) {
    $check("rejects: $label", $throws(fn() => Job::normalize($data, $engines)) !== null, true);
}
$check('unknown engine error names it',
    str_contains((string) $throws(fn() => Job::normalize(['engines' => ['bard']] + $valid, $engines)), "'bard'"),
    true);

// ---------------------------------------------------------------------------
echo "\nJob file loading\n";
$check('missing file rejected', $throws(fn() => Job::load("$tmpDir/nope.json", $engines)) !== null, true);
file_put_contents("$tmpDir/bad.json", '{not json');
$check('invalid JSON rejected', $throws(fn() => Job::load("$tmpDir/bad.json", $engines)) !== null, true);
file_put_contents("$tmpDir/ok.json", json_encode($valid));
$check('valid file loads', Job::load("$tmpDir/ok.json", $engines)['client']['domain'], 'eastcoastutility.com');

// ---------------------------------------------------------------------------
echo "\nAnalyzer profile\n";
$profile = Job::analyzerProfile($j['client']);
$check('business name is an alias', in_array('East Coast Utility, LLC', $profile['aliases'], true), true);
$check('name without legal suffix is an alias', in_array('East Coast Utility', $profile['aliases'], true), true);
$check('suffix-stripped alias detects a plain mention',
    (new Analyzer($profile))->analyze(['answer' => 'East Coast Utility installs gas mains.', 'sources' => []])['name_mentioned'],
    true);

$explicit = Job::analyzerProfile(Job::normalize(
    ['client' => ['name' => 'ECU LLC', 'domain' => 'eastcoastutility.com', 'aliases' => ['Tom Colleran']]] + $valid,
    $engines
)['client']);
$check('explicit aliases kept; short stripped name skipped', $explicit['aliases'], ['Tom Colleran', 'ECU LLC']);

// ---------------------------------------------------------------------------
echo "\nOther domains the business owns\n";
$check('other_domains defaults to empty', $j['client']['other_domains'], []);
$check('an older job without the field still loads', $profile['other_domains'], []);

$twoSites = Job::normalize(['client' => [
    'name'          => 'John R. Guzzi Roofing',
    'domain'        => 'johnrguzziroofing.com',
    'other_domains' => ['https://www.GuzziRoofing.com/', 'guzziroofing.com', 'johnrguzziroofing.com'],
]] + $valid, $engines);
$check('other domains normalized, deduplicated, primary dropped',
    $twoSites['client']['other_domains'], ['guzziroofing.com']);

foreach ([
    'other_domains not a list'   => ['name' => 'A Co', 'domain' => 'a.com', 'other_domains' => 'b.com'],
    'other domain without a dot' => ['name' => 'A Co', 'domain' => 'a.com', 'other_domains' => ['localhost']],
    'other domain not a string'  => ['name' => 'A Co', 'domain' => 'a.com', 'other_domains' => [42]],
    'too many other domains'     => ['name' => 'A Co', 'domain' => 'a.com',
        'other_domains' => array_map(fn($n) => "site$n.com", range(1, Job::MAX_OTHER_DOMAINS + 1))],
] as $label => $client) {
    $check("rejects: $label", $throws(fn() => Job::normalize(['client' => $client] + $valid, $engines)) !== null, true);
}

// The case that found this: the report said "cited on 0 of 20" while the
// business's second domain was cited, and listed that domain as a rival.
$guzzi = (new Analyzer(Job::analyzerProfile($twoSites['client'])))->analyze([
    'answer'  => 'Several roofers serve Wall Township.',
    'sources' => [
        ['url' => 'https://guzziroofing.com/roof-repair', 'title' => 'Guzzi Roofing', 'cited' => true],
        ['url' => 'https://www.fbroofingsiding.com/', 'title' => 'FB Roofing', 'cited' => true],
    ],
]);
$check('a citation of the other domain counts as own_cited', $guzzi['own_cited'], true);
$check('...at its position among the sources', $guzzi['own_rank'], 1);
$check('...and it is never listed as a rival', array_column($guzzi['rivals'], 'host'), ['fbroofingsiding.com']);

// ---------------------------------------------------------------------------
echo "\nResult assembly\n";
$rows = [
    ['engine' => 'perplexity', 'model' => 'sonar', 'query' => 'q1', 'category' => 'service-geo',
     'own_cited' => true, 'name_mentioned' => true, 'cost_usd' => 0.006, 'error' => null],
    ['engine' => 'perplexity', 'model' => 'sonar', 'query' => 'q2', 'category' => 'cost',
     'own_cited' => false, 'name_mentioned' => false, 'cost_usd' => 0.005, 'error' => null],
    ['engine' => 'claude', 'model' => 'claude-sonnet-5', 'query' => 'q1', 'category' => 'service-geo',
     'own_cited' => true, 'name_mentioned' => false, 'cost_usd' => 0.1, 'error' => null],
    ['engine' => 'claude', 'model' => 'claude-sonnet-5', 'query' => 'q2', 'category' => 'cost',
     'own_cited' => false, 'name_mentioned' => false, 'cost_usd' => 0.0, 'error' => 'HTTP 429: rate limit'],
];
$job2 = Job::normalize(['engines' => ['perplexity', 'claude']] + $valid, $engines);
$res  = Job::result($job2, $rows, '2026-09-15T12:00:00+00:00', '2026-09-15T12:01:00+00:00');
$byEngine = array_column($res['engines'], null, 'engine');

$check('result version', $res['version'], Job::RESULT_VERSION);
$check('questions counted once, not per engine', $res['totals']['questions'], 2);
$check('answers exclude errors', $res['totals']['answers'], 3);
$check('errors counted', $res['totals']['errors'], 1);
$check('question cited by two engines counts once', $res['totals']['cited_questions'], 1);
$check('named questions', $res['totals']['named_questions'], 1);
$check('cost summed across engines', $res['totals']['cost_usd'], 0.111);
$check('one summary per engine', count($res['engines']), 2);
$check('per-engine cited', $byEngine['claude']['cited'], 1);
$check('per-engine errors', $byEngine['claude']['errors'], 1);
$check('every row kept', count($res['results']), 4);

// ---------------------------------------------------------------------------
echo "\nResult file writing\n";
$out = "$tmpDir/nested/result.json";
$res['results'][0]['answer'] = "invalid UTF-8 \xB1\x31 from a third party";
Job::write($out, $res);
$decoded = json_decode((string) file_get_contents($out), true);
$check('written file is valid JSON', is_array($decoded), true);
$check('invalid UTF-8 did not abort the write', is_string($decoded['results'][0]['answer'] ?? null), true);
$check('no temp files left behind', count(glob("$tmpDir/nested/*.tmp-*") ?: []), 0);

// ---------------------------------------------------------------------------
echo "\nCLI contract\n";
$php   = escapeshellarg(PHP_BINARY);
$panel = escapeshellarg("$root/panel.php");

exec("$php $panel job 2>&1", $o1, $code1);
$check('missing --in/--out exits 2', $code1, 2);

file_put_contents("$tmpDir/invalid-job.json", json_encode(['client' => ['name' => 'A Co']]));
exec("$php $panel job --in=" . escapeshellarg("$tmpDir/invalid-job.json")
    . ' --out=' . escapeshellarg("$tmpDir/r.json") . ' 2>&1', $o2, $code2);
$check('invalid job file exits 2 before any API call', $code2, 2);
$check('invalid job file writes no result', is_file("$tmpDir/r.json"), false);

// The retry path must not crash. A constant defined after the command dispatch
// was undefined when `job` hit its first transient failure, killing the panel
// with a fatal error. Point Perplexity at a closed local port so the first
// request fails instantly and the runner goes straight to its retry check; a
// healthy panel is then waiting out its backoff, not dead.
file_put_contents("$tmpDir/retry-job.json", json_encode($valid));
$proc = proc_open(
    [PHP_BINARY, "$root/panel.php", 'job', "--in=$tmpDir/retry-job.json", "--out=$tmpDir/retry-result.json"],
    [1 => ['file', "$tmpDir/retry.out", 'w'], 2 => ['file', "$tmpDir/retry.err", 'w']],
    $pipes,
    null,
    ['PERPLEXITY_API_KEY' => 'test-key-not-real', 'PANEL_PERPLEXITY_ENDPOINT' => 'http://127.0.0.1:9/', 'PATH' => getenv('PATH') ?: '']
);
$alive = true;
$exitCode = null;
for ($i = 0; $i < 20; $i++) {
    usleep(100_000);
    $status = proc_get_status($proc);
    if (!$status['running']) { $alive = false; $exitCode = $status['exitcode']; break; }
}
if ($alive) { proc_terminate($proc); }
proc_close($proc);
$stderr = (string) @file_get_contents("$tmpDir/retry.err");
$check('first transient failure does not crash the runner', $alive || ($exitCode !== 255 && !str_contains($stderr, 'Fatal error')), true);

// ---------------------------------------------------------------------------
$it = new \RecursiveIteratorIterator(
    new \RecursiveDirectoryIterator($tmpDir, \FilesystemIterator::SKIP_DOTS),
    \RecursiveIteratorIterator::CHILD_FIRST
);
foreach ($it as $f) { $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname()); }
rmdir($tmpDir);

printf("\n%d passed, %d failed\n\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);
