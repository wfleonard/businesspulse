<?php
declare(strict_types=1);

/**
 * Offline regression test — no API keys, no network, no spend.
 *
 *   php tests/smoke.php
 *
 * Covers the two things most likely to break silently: engine response parsing
 * (the wire shapes drift) and multi-engine report aggregation.
 */

namespace Saxon\Panel;

use Saxon\Panel\Engines\ClaudeEngine;
use Saxon\Panel\Engines\OpenAIEngine;
use Saxon\Panel\Engines\PerplexityEngine;

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
    printf("  %s %-52s %s\n", $ok ? 'ok  ' : 'FAIL',
        $label, $ok ? '' : 'got ' . var_export($actual, true)
                          . ', want ' . var_export($expected, true));
};

$client = json_decode((string) file_get_contents($root . '/tests/fixtures/eastcoastutility.json'), true);

// ---------------------------------------------------------------------------
echo "\nPerplexity response parsing\n";
// Shape per docs.perplexity.ai/docs/sonar/quickstart
$pplxBody = json_encode([
    'id' => 'x', 'model' => 'sonar', 'created' => 1,
    'usage' => [
        'prompt_tokens' => 120, 'completion_tokens' => 340, 'total_tokens' => 460,
        'cost' => ['input_tokens_cost' => 0.0001, 'output_tokens_cost' => 0.0003,
                   'total_cost' => 0.0064],
    ],
    'choices' => [[
        'index' => 0, 'finish_reason' => 'stop',
        'message' => ['role' => 'assistant',
                      'content' => 'East Coast Utility is a Fair Haven, NJ contractor.'],
    ]],
    'citations' => [
        'https://www.eastcoastutility.com/',
        'https://boringcontractors.com/locations/new-jersey/',
    ],
    'search_results' => [
        ['title' => 'East Coast Utility', 'url' => 'https://www.eastcoastutility.com/',
         'snippet' => '...', 'source' => 'web'],
        ['title' => 'Boring Contractors NJ', 'url' => 'https://boringcontractors.com/locations/new-jersey/',
         'snippet' => '...', 'source' => 'web'],
        ['title' => 'Never Cited Co', 'url' => 'https://nevercited.com/nj', 'snippet' => '...'],
    ],
]);

$pplx = new PerplexityEngine('sonar', 'test-key');
$p = $pplx->parse($pplxBody, 200);
$check('no error', $p['error'], null);
$check('answer captured', str_contains($p['answer'], 'Fair Haven'), true);
$check('3 sources (union of both arrays)', count($p['sources']), 3);
$check('citations marked cited', count(array_filter($p['sources'], fn($s) => $s['cited'])), 2);
$check('retrieved-but-uncited kept', $p['sources'][2]['cited'], false);
$check('input tokens', $p['input_tokens'], 120);
$check('reported cost preferred over estimate', $pplx->costOf($p), 0.0064);

$pErr = $pplx->parse(json_encode(['error' => ['message' => 'invalid model']]), 400);
$check('http error surfaces message', str_contains((string) $pErr['error'], 'invalid model'), true);

// Citations-only response (no search_results) must still yield sources.
$pOnly = $pplx->parse(json_encode([
    'choices' => [['message' => ['content' => 'x']]],
    'citations' => ['https://a.com/1'],
]), 200);
$check('citations-only still produces sources', count($pOnly['sources']), 1);

// ---------------------------------------------------------------------------
echo "\nClaude response parsing\n";
$claudeBody = json_encode([
    'stop_reason' => 'end_turn',
    'usage' => ['input_tokens' => 17440, 'output_tokens' => 1433],
    'content' => [
        ['type' => 'server_tool_use', 'name' => 'web_search', 'input' => ['query' => 'x']],
        ['type' => 'web_search_tool_result', 'content' => [
            ['type' => 'web_search_result', 'url' => 'https://boringcontractors.com/nj', 'title' => 'BC'],
            ['type' => 'web_search_result', 'url' => 'https://seenonly.com/x', 'title' => 'Seen'],
        ]],
        ['type' => 'text', 'text' => 'Several firms operate in NJ.', 'citations' => [
            ['type' => 'web_search_result_location', 'url' => 'https://boringcontractors.com/nj',
             'title' => 'BC', 'cited_text' => '...'],
        ]],
    ],
]);
$claude = new ClaudeEngine('claude-sonnet-5', 5, 'medium', 'test-key');
$c = $claude->parse($claudeBody, 200);
$check('no error', $c['error'], null);
$check('search counted', $c['searches'], 1);
$check('2 sources', count($c['sources']), 2);
$check('one cited', count(array_filter($c['sources'], fn($s) => $s['cited'])), 1);
$check('refusal handled', (new ClaudeEngine('claude-sonnet-5', 5, 'medium', 'k'))
    ->parse(json_encode(['stop_reason' => 'refusal',
        'stop_details' => ['category' => 'cyber'], 'usage' => []]), 200)['error'] !== null, true);

// ---------------------------------------------------------------------------
echo "\nOpenAI response parsing\n";
// Shape per developers.openai.com/api/docs/guides/tools-web-search
$oaBody = json_encode([
    'status' => 'completed',
    'usage'  => ['input_tokens' => 2100, 'output_tokens' => 640, 'total_tokens' => 2740],
    'output' => [
        ['type' => 'reasoning', 'summary' => []],          // must be skipped
        ['type' => 'web_search_call', 'id' => 'ws_1', 'status' => 'completed',
         'action' => ['type' => 'search', 'query' => 'hdd contractor nj']],
        ['type' => 'message', 'content' => [[
            'type' => 'output_text',
            'text' => 'Options include East Coast Utility and others.',
            'annotations' => [
                ['type' => 'url_citation', 'start_index' => 0, 'end_index' => 10,
                 'url' => 'https://www.eastcoastutility.com/', 'title' => 'East Coast Utility'],
                ['type' => 'url_citation', 'start_index' => 11, 'end_index' => 20,
                 'url' => 'https://boringcontractors.com/nj', 'title' => 'BC'],
                ['type' => 'file_citation', 'url' => 'ignored'],   // wrong type, skip
            ],
        ]]],
    ],
]);
$oa = new OpenAIEngine('gpt-5.6-terra', 'medium', 'test-key');
$o = $oa->parse($oaBody, 200);
$check('no error', $o['error'], null);
$check('reasoning item skipped, answer clean',
    str_starts_with($o['answer'], 'Options include'), true);
$check('search counted', $o['searches'], 1);
$check('2 url_citations, file_citation ignored', count($o['sources']), 2);
$check('all annotations marked cited',
    count(array_filter($o['sources'], fn($s) => $s['cited'])), 2);
$check('input tokens (input_tokens not prompt_tokens)', $o['input_tokens'], 2100);
$check('cost estimated > 0', $oa->costOf($o) > 0, true);

$oaErr = $oa->parse(json_encode(['error' => ['message' => 'model not found']]), 404);
$check('http error surfaces message', str_contains((string) $oaErr['error'], 'model not found'), true);
$oaInc = $oa->parse(json_encode(['status' => 'incomplete',
    'incomplete_details' => ['reason' => 'max_output_tokens'], 'usage' => []]), 200);
$check('incomplete status surfaces', str_contains((string) $oaInc['error'], 'max_output_tokens'), true);

// When the search call carries sources, retrieved-vs-cited stays meaningful.
$oaSrc = $oa->parse(json_encode(['status' => 'completed', 'usage' => [], 'output' => [
    ['type' => 'web_search_call', 'action' => ['type' => 'search', 'sources' => [
        ['url' => 'https://seenonly.com/x', 'title' => 'Seen'],
        ['url' => 'https://cited.com/y', 'title' => 'C'],
    ]]],
    ['type' => 'message', 'content' => [['type' => 'output_text', 'text' => 't',
        'annotations' => [['type' => 'url_citation', 'url' => 'https://cited.com/y', 'title' => 'C']]]]],
]]), 200);
$check('sources give retrieved-but-uncited', count($oaSrc['sources']), 2);
$check('only annotated one is cited',
    count(array_filter($oaSrc['sources'], fn($s) => $s['cited'])), 1);

// ---------------------------------------------------------------------------
echo "\nRetry classification\n";
$permanent = [
    'openai out of credits' => '{"error":{"message":"You have no credits remaining","type":"insufficient_quota"}}',
    'openai quota exceeded' => '{"error":{"message":"You exceeded your current quota"}}',
    'anthropic low balance' => '{"error":{"message":"Your credit balance is too low"}}',
    'bad key'               => '{"error":{"type":"authentication_error"}}',
    'bad model'             => '{"error":{"code":"model_not_found"}}',
];
foreach ($permanent as $label => $body) {
    $check("permanent: $label", Retry::isPermanentFailure($body), true);
}
$transient = [
    'real rate limit' => '{"error":{"message":"Rate limit reached for requests","type":"rate_limit_error"}}',
    'overloaded'      => '{"type":"error","error":{"type":"overloaded_error"}}',
    'empty body'      => '',
];
foreach ($transient as $label => $body) {
    $check("retryable: $label", Retry::isPermanentFailure($body), false);
}

// ---------------------------------------------------------------------------
echo "\nAnalyzer verdicts\n";
$an = new Analyzer($client);
$v1 = $an->analyze($p);                       // own domain cited + named
$check('own_cited true', $v1['own_cited'], true);
$check('name_mentioned true', $v1['name_mentioned'], true);
$check('rivals exclude own domain', in_array('eastcoastutility.com',
    array_column($v1['rivals'], 'host'), true), false);

$v2 = $an->analyze([
    'answer' => 'You can find East Coast Utility on Yelp.',
    'sources' => [['url' => 'https://www.yelp.com/biz/ecu', 'title' => 'Yelp', 'cited' => true],
                  ['url' => 'https://rival.com', 'title' => 'R', 'cited' => true]],
]);
$check('directory_only detected', $v2['directory_only'], true);
$check('directory not counted as rival', count($v2['rivals']), 1);

// Regression: a directory domain in the results is NOT evidence the client is
// listed on it. Without a brand mention this must stay absent, not directory.
$v2b = $an->analyze([
    'answer'  => 'Several NJ boring companies are listed in local directories.',
    'sources' => [['url' => 'https://www.bbb.org/us/nj/edison/category/directional-boring',
                   'title' => 'BBB', 'cited' => true],
                  ['url' => 'https://rival.com', 'title' => 'R', 'cited' => true]],
]);
$check('directory without brand mention is NOT directory_only', $v2b['directory_only'], false);
$check('...and is not counted as cited either', $v2b['own_cited'], false);

$v3 = $an->analyze(['answer' => 'Try Wikipedia.', 'sources' => [
    ['url' => 'https://en.wikipedia.org/wiki/HDD', 'title' => 'W', 'cited' => true]]]);
$check('reference domain not a rival', count($v3['rivals']), 0);
$check('absent verdict', $v3['own_cited'] || $v3['name_mentioned'], false);

$v4 = $an->analyze(['answer' => '', 'sources' => [
    ['url' => 'https://blog.eastcoastutility.com/post', 'title' => 'B', 'cited' => true]]]);
$check('subdomain counts as own', $v4['own_cited'], true);

// ---------------------------------------------------------------------------
echo "\nMulti-engine report aggregation\n";
@unlink($root . '/data/test.sqlite');
$db = new Db($root . '/data/test.sqlite');

$fixtures = [
    // query, category, claude verdict, perplexity verdict
    ['directional boring companies in NJ', 'service-geo', 'cited',  'absent'],
    ['how much does HDD cost per foot',    'cost',        'absent', 'absent'],
    ['NJDOT road opening permit',          'permits',     'absent', 'named'],
];
$runIds = [];
foreach (['claude' => 'claude-sonnet-5', 'perplexity' => 'sonar'] as $eng => $model) {
    $runIds[$eng] = $db->startRun($client['slug'], $eng, $model);
    foreach ($fixtures as $f) {
        $verdict = $eng === 'claude' ? $f[2] : $f[3];
        $db->saveResult($runIds[$eng], [
            'query' => $f[0], 'category' => $f[1], 'answer' => 'x',
            'own_cited'      => $verdict === 'cited',
            'name_mentioned' => in_array($verdict, ['cited', 'named'], true),
            'directory_only' => false,
            'sources' => [], 'rivals' => [['host' => 'rival.com', 'title' => 'R', 'cited' => true]],
            'input_tokens' => 100, 'output_tokens' => 50, 'searches' => 1,
        ]);
    }
    $db->finishRun($runIds[$eng], count($fixtures), 0, 0.25);
}

$runs = $db->runs(array_values($runIds));
$check('both runs retrieved', count($runs), 2);
$results = $db->resultsForRuns(array_values($runIds));
$check('6 result rows', count($results), 6);
$check('engine tagged on results', isset($results[0]['engine']), true);
$check('latestRunPerEngine returns 2', count($db->latestRunPerEngine($client['slug'])), 2);

$agg = (new Report($client, $runs, $results, $db->history($client['slug'])))->aggregate();
$check('3 distinct questions', $agg['questions'], 3);
$check('6 answers', $agg['answers'], 6);
$check('cited by >=1 engine: 1', $agg['q_any_cited'], 1);
$check('invisible everywhere: 1', $agg['q_invisible'], 1);
$check('2 engines', count($agg['engines']), 2);
$check('claude cited 1', $agg['engines']['claude']['own'], 1);
$check('perplexity cited 0', $agg['engines']['perplexity']['own'], 0);
$check('combined cost', $agg['cost'], 0.5);

$rep = new Report($client, $runs, $results, $db->history($client['slug']));
$html = $rep->html();
$check('html has per-assistant block', str_contains($html, 'Result by assistant'), true);
$check('html has both engine columns', substr_count($html, '<th>Claude</th>')
    + substr_count($html, '<th>Perplexity</th>'), 2);
$check('html mentions 2 assistants', str_contains($html, '2 AI assistants'), true);
$check('console renders', str_contains($rep->console(), 'Per assistant'), true);

// single-engine path must still work through the same code
$solo = new Report($client, [$runs[0]], $db->resultsForRuns([$runs[0]['id']]), []);
$sa = $solo->aggregate();
$check('single-engine questions', $sa['questions'], 3);
$check('single-engine no per-assistant block',
    str_contains($solo->html(), 'Result by assistant'), false);
$check('single-engine says "assistant"', str_contains($solo->html(), '1 AI assistant'), true);

// ---------------------------------------------------------------------------
// Zero-search answers: the model replied from memory instead of looking. These
// must NOT be scored as invisibility — they are held out of the denominator.
echo "\nUngrounded (zero-search) scoring\n";
@unlink($root . '/data/test.sqlite');
foreach (glob($root . '/data/test.sqlite*') ?: [] as $f) { @unlink($f); }
$db = new Db($root . '/data/test.sqlite');

$ungFixtures = [
    // query, verdict, searches
    ['searched and found you',     'cited',  1],
    ['searched and missed you',    'absent', 1],
    ['answered without searching', 'absent', 0],
    ['named from memory',          'named',  0],
];
$uid = $db->startRun($client['slug'], 'claude', 'claude-sonnet-5');
foreach ($ungFixtures as $f) {
    $db->saveResult($uid, [
        'query' => $f[0], 'category' => 'cost', 'answer' => 'x',
        'own_cited'      => $f[1] === 'cited',
        'name_mentioned' => in_array($f[1], ['cited', 'named'], true),
        'directory_only' => false,
        'sources' => [], 'rivals' => [],
        'input_tokens' => 10, 'output_tokens' => 10, 'searches' => $f[2],
    ]);
}
$db->finishRun($uid, count($ungFixtures), 0, 0.1);

$ua = (new Report($client, $db->runs([$uid]), $db->resultsForRuns([$uid]), []))->aggregate();
$check('4 questions asked',        $ua['questions'],    4);
$check('3 measured (searched)',    $ua['q_grounded'],   3);
$check('1 held out as unmeasured', $ua['q_unmeasured'], 1);
// Only "searched and missed you" is real invisibility. The unsearched absent
// answer must not join it; the unsearched *named* answer stays a brand signal.
$check('invisible counts only searched misses', $ua['q_invisible'], 1);
$check('named-from-memory still counts named',  $ua['q_any_named'],  2);
$check('engine ungrounded tally',   $ua['engines']['claude']['ungrounded'], 1);
$check('ungrounded answers total',  $ua['ungrounded_answers'], 1);

$uhtml = (new Report($client, $db->runs([$uid]), $db->resultsForRuns([$uid]), []))->html();
$check('html marks the no-search row', str_contains($uhtml, '>no search<'), true);
$check('html discloses the holdout',   str_contains($uhtml, 'excluded from these rates'), true);
// 1 invisible of 3 measured = 33%, not 1 of 4 = 25%.
$check('headline uses measured denominator', str_contains($uhtml, '<div class="big">33%'), true);

// A run where every assistant searched must read exactly as it did before this
// distinction existed — no holdout note, no stray "no search" markers.
$cleanHtml = (new Report($client, $runs, $results, []))->html();
$check('clean run hides holdout note',
    str_contains($cleanHtml, 'excluded from these rates'), false);
$check('clean run has no no-search cells', str_contains($cleanHtml, '>no search<'), false);

// ---------------------------------------------------------------------------
// Collection dates: a panel finished by `retry` can span more than one day, and
// the methodology note must say so rather than dating everything from the first
// run's start.
echo "\nCollection date reporting\n";
$oneDayHtml = (new Report($client, $runs, $results, []))->html();
$check('single-day run says "on <date>"',
    (bool) preg_match('/live web search enabled, on \w+ \d+, \d{4}\./', $oneDayHtml), true);
$check('single-day run adds no span note',
    str_contains($oneDayHtml, 'not all collected on one day'), false);

// Same results, but with two rows backdated to the previous day.
$spanResults = $results;
$spanResults[0]['created_at'] = '2026-08-14T10:00:00+00:00';
$spanResults[1]['created_at'] = '2026-08-14T10:00:00+00:00';
foreach ([2, 3, 4, 5] as $i) {
    if (isset($spanResults[$i])) { $spanResults[$i]['created_at'] = '2026-08-15T10:00:00+00:00'; }
}
$spanHtml = (new Report($client, $runs, $spanResults, []))->html();
$check('multi-day run reports a span',
    str_contains($spanHtml, 'between 14 August 2026 and 15 August 2026'), true);
$check('multi-day run discloses the split',
    str_contains($spanHtml, 'not all collected on one day'), true);
$check('multi-day run gives per-day counts',
    str_contains($spanHtml, '2 on 14 August 2026'), true);

// ---------------------------------------------------------------------------
// Retry: the failed rows of a run are re-runnable in place, and the run's
// totals are derived from what it actually holds afterwards.
echo "\nRetry bookkeeping\n";
@unlink($root . '/data/test.sqlite');
foreach (glob($root . '/data/test.sqlite*') ?: [] as $f) { @unlink($f); }
$db = new Db($root . '/data/test.sqlite');

$rid = $db->startRun($client['slug'], 'claude', 'claude-sonnet-5');
foreach ([['q1', null], ['q2', null], ['q3', 'HTTP 429: rate limit'], ['q4', 'HTTP 429: rate limit']] as $f) {
    $db->saveResult($rid, [
        'query' => $f[0], 'category' => 'cost', 'answer' => 'x',
        'own_cited' => false, 'name_mentioned' => false, 'directory_only' => false,
        'sources' => [], 'rivals' => [], 'searches' => 1, 'error' => $f[1],
    ]);
}
$db->finishRun($rid, 2, 2, 1.50);

$failed = $db->erroredResults($rid);
$check('2 errored rows found', count($failed), 2);
$check('errored rows carry the query text', $failed[0]['query'], 'q3');
$check('errored rows carry the cause', str_contains($failed[0]['error'], '429'), true);

// Retry deletes the failed rows, then the runner re-inserts them.
$db->deleteResults(array_column($failed, 'id'));
$check('failed rows removed', count($db->erroredResults($rid)), 0);
$check('successful rows untouched', count($db->results($rid)), 2);

foreach (['q3', 'q4'] as $q) {
    $db->saveResult($rid, [
        'query' => $q, 'category' => 'cost', 'answer' => 'x',
        'own_cited' => true, 'name_mentioned' => true, 'directory_only' => false,
        'sources' => [], 'rivals' => [], 'searches' => 1,
    ]);
}
$db->recountRun($rid, 0.75);
$after = $db->run($rid);
$check('no duplicate rows after retry', count($db->results($rid)), 4);
$check('query_count derived, not passed', (int) $after['query_count'], 4);
$check('error_count cleared', (int) $after['error_count'], 0);
// The first pass's money was really spent — a retried run costs both passes.
$check('cost is additive across passes', round((float) $after['cost_usd'], 2), 2.25);
$check('deleteResults ignores an empty list',
    (function () use ($db, $rid) { $db->deleteResults([]); return count($db->results($rid)); })(), 4);

@unlink($root . '/data/test.sqlite');
foreach (glob($root . '/data/test.sqlite*') ?: [] as $f) { @unlink($f); }

printf("\n%d passed, %d failed\n\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);
