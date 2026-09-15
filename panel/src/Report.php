<?php
declare(strict_types=1);

namespace Saxon\Panel;

/**
 * Aggregates one or more runs into a console summary and a print-ready audit.
 *
 * Multi-engine is the default shape, not a special case: a single run is simply
 * N=1. This matters because "we asked four assistants" is what makes the
 * headline number defensible to a prospect, and "we asked one" is the weakness
 * a sharp buyer would otherwise find first.
 */
final class Report
{
    /** @param array<int,array> $runs @param array<int,array> $results */
    public function __construct(
        private array $client,
        private array $runs,
        private array $results,
        private array $history = [],
    ) {}

    public function aggregate(): array
    {
        $engines = [];
        $queries = [];
        $rivals  = [];
        $errors  = 0;
        $searches = 0;

        foreach ($this->runs as $run) {
            $engines[$run['engine']] ??= [
                'engine' => $run['engine'], 'model' => $run['model'],
                'total' => 0, 'own' => 0, 'named' => 0, 'dir' => 0,
                'ungrounded' => 0,
            ];
        }

        foreach ($this->results as $r) {
            $eng = $r['engine'] ?? ($this->runs[0]['engine'] ?? 'unknown');
            $engines[$eng] ??= ['engine' => $eng, 'model' => $r['model'] ?? '',
                                'total' => 0, 'own' => 0, 'named' => 0, 'dir' => 0,
                                'ungrounded' => 0];

            if (!empty($r['error'])) { $errors++; continue; }

            $q = $r['query'];
            $queries[$q] ??= ['query' => $q, 'category' => $r['category'] ?: 'uncategorized',
                              'engines' => [], 'rivals' => []];

            // An answer with zero searches was produced from the model's memory:
            // it never looked at the live web. That is NOT the same finding as
            // "it searched and you weren't there", and scoring the two alike
            // inflates the invisibility headline with questions we never actually
            // measured. Only a verdict that would otherwise be 'absent' is
            // reclassified — an unsearched answer that still names the brand is a
            // real signal (the brand is in the training data), so it keeps 'named'.
            $grounded = ((int) ($r['searches'] ?? 0)) > 0;

            $verdict = $r['own_cited'] ? 'cited'
                     : ($r['name_mentioned'] ? 'named'
                     : ($r['directory_only'] ? 'directory'
                     : ($grounded ? 'absent' : 'ungrounded')));
            $queries[$q]['engines'][$eng] = $verdict;

            $engines[$eng]['total']++;
            if ($r['own_cited'])          { $engines[$eng]['own']++; }
            if ($r['name_mentioned'])     { $engines[$eng]['named']++; }
            if ($r['directory_only'])     { $engines[$eng]['dir']++; }
            if ($verdict === 'ungrounded'){ $engines[$eng]['ungrounded']++; }

            $searches += (int) $r['searches'];

            foreach (json_decode($r['rivals_json'] ?: '[]', true) ?: [] as $rv) {
                $h = $rv['host'];
                $rivals[$h] ??= ['host' => $h, 'title' => $rv['title'] ?? '',
                                 'hits' => 0, 'cited' => 0, 'engines' => []];
                $rivals[$h]['hits']++;
                $rivals[$h]['engines'][$eng] = true;
                if (!empty($rv['cited'])) { $rivals[$h]['cited']++; }
                if ($rivals[$h]['title'] === '' && !empty($rv['title'])) {
                    $rivals[$h]['title'] = $rv['title'];
                }
            }
        }

        // Question-level rollup: presence anywhere beats presence nowhere.
        //
        // A question counts as *measured* once at least one assistant actually
        // searched for it. If none did, the question is unmeasured — we learned
        // nothing about the client's visibility on it, and it is held out of the
        // invisibility count rather than scored as a loss.
        $anyCited = 0; $anyNamed = 0; $invisible = 0; $grounded = 0; $unmeasured = 0;
        $byCat = [];
        foreach ($queries as $q) {
            $cat = $q['category'];
            $byCat[$cat] ??= ['q' => 0, 'own' => 0, 'grounded' => 0, 'unmeasured' => 0];
            $byCat[$cat]['q']++;

            $verdicts = array_values($q['engines']);
            $cited = in_array('cited', $verdicts, true);
            $named = $cited || in_array('named', $verdicts, true)
                            || in_array('directory', $verdicts, true);
            $qGrounded = (bool) array_filter($verdicts, fn($v) => $v !== 'ungrounded');

            if ($cited) { $anyCited++; $byCat[$cat]['own']++; }
            if ($named) { $anyNamed++; }

            if ($qGrounded) {
                $grounded++;
                $byCat[$cat]['grounded']++;
                if (!$named) { $invisible++; }
            } else {
                $unmeasured++;
                $byCat[$cat]['unmeasured']++;
            }
        }

        uasort($rivals, fn($a, $b) => [$b['cited'], $b['hits']] <=> [$a['cited'], $a['hits']]);
        ksort($byCat);
        ksort($engines);

        $ownAnswers   = array_sum(array_column($engines, 'own'));
        $namedAnswers = array_sum(array_column($engines, 'named'));
        $dirAnswers   = array_sum(array_column($engines, 'dir'));
        $answers      = array_sum(array_column($engines, 'total'));

        return [
            'engines'      => $engines,
            'questions'    => count($queries),
            'answers'      => $answers,
            'own_answers'  => $ownAnswers,
            'named_answers'=> $namedAnswers,
            'dir_answers'  => $dirAnswers,
            'q_any_cited'  => $anyCited,
            'q_any_named'  => $anyNamed,
            'q_invisible'  => $invisible,
            // Denominator for every visibility rate that claims to be a finding.
            'q_grounded'   => $grounded,
            'q_unmeasured' => $unmeasured,
            'ungrounded_answers' => array_sum(array_column($engines, 'ungrounded')),
            'by_category'  => $byCat,
            'rivals'       => array_values($rivals),
            'queries'      => array_values($queries),
            'errors'       => $errors,
            'searches'     => $searches,
            'cost'         => array_sum(array_map(fn($r) => (float) $r['cost_usd'], $this->runs)),
        ];
    }

    public function console(): string
    {
        $a = $this->aggregate();
        $pct = fn(int $x, int $d) => sprintf('%5.1f%%', $x / max(1, $d) * 100);

        $engineList = implode(' + ', array_map(
            fn($e) => "{$e['engine']}/{$e['model']}", $a['engines']));

        $out  = "\n" . str_repeat('=', 66) . "\n";
        $out .= sprintf("  %s  —  AI Search Visibility\n", $this->client['name']);
        $out .= sprintf("  %s\n  %s\n", $this->client['domain'], $engineList);
        $out .= str_repeat('=', 66) . "\n\n";

        $out .= sprintf("  Questions asked         %d   (%d answer%s across %d assistant%s)\n",
            $a['questions'], $a['answers'], $a['answers'] === 1 ? '' : 's',
            count($a['engines']), count($a['engines']) === 1 ? '' : 's');
        // Rates are quoted over the questions at least one assistant actually
        // searched. Quoting them over questions *asked* would silently credit
        // unsearched answers as evidence of invisibility.
        $g = max(1, $a['q_grounded']);
        $out .= sprintf("  Measured (searched)     %d   (%d answered from memory, held out)\n",
            $a['q_grounded'], $a['q_unmeasured']);
        $out .= sprintf("  Cited by at least one   %d  (%s)   <- the number that matters\n",
            $a['q_any_cited'], $pct($a['q_any_cited'], $g));
        $out .= sprintf("  Invisible everywhere    %d  (%s)\n",
            $a['q_invisible'], $pct($a['q_invisible'], $g));
        if ($a['errors']) { $out .= sprintf("  Errors                  %d\n", $a['errors']); }

        if (count($a['engines']) > 1) {
            $out .= "\n  Per assistant\n  " . str_repeat('-', 62) . "\n";
            foreach ($a['engines'] as $e) {
                $searched = $e['total'] - $e['ungrounded'];
                $out .= sprintf("  %-12s %-20s  cited %2d/%-3d (%s)  named %2d  no-search %2d\n",
                    $e['engine'], $e['model'], $e['own'], $searched,
                    $pct($e['own'], $searched), $e['named'], $e['ungrounded']);
            }
        }

        $out .= "\n  By intent category (cited by any assistant)\n  " . str_repeat('-', 62) . "\n";
        foreach ($a['by_category'] as $cat => $c) {
            $bar = str_repeat('#', (int) round($c['own'] / max(1, $c['q']) * 20));
            $out .= sprintf("  %-18s %2d/%-3d %-20s %s\n", $cat, $c['own'], $c['q'], $bar,
                sprintf('%.0f%%', $c['own'] / max(1, $c['q']) * 100));
        }

        $out .= "\n  Who gets cited instead (top 15)\n  " . str_repeat('-', 62) . "\n";
        foreach (array_slice($a['rivals'], 0, 15) as $i => $rv) {
            $out .= sprintf("  %2d. %-40s %2d cited / %2d seen  [%s]\n",
                $i + 1, substr($rv['host'], 0, 40), $rv['cited'], $rv['hits'],
                implode(',', array_keys($rv['engines'])));
        }

        $out .= sprintf("\n  %d grounded searches · est. cost $%.2f\n\n", $a['searches'], $a['cost']);
        return $out;
    }

    public function html(): string
    {
        $a = $this->aggregate();
        $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');

        $date = date('F j, Y', strtotime((string) ($this->runs[0]['started_at'] ?? 'now')));

        // When a run is interrupted — exhausted credits, a provider rate limit —
        // `panel.php retry` completes it later, and the answers can then span
        // more than one day. Dating the audit from the first run's start would
        // claim a precision the data does not have, and a reader who checks will
        // find the discrepancy on their own. State the real span instead.
        // A panel collected in a single day reads exactly as it did before.
        $byDay = [];
        foreach ($this->results as $r) {
            if (!empty($r['error'])) { continue; }
            $day = substr((string) ($r['created_at'] ?? ''), 0, 10);
            if ($day !== '') { $byDay[$day] = ($byDay[$day] ?? 0) + 1; }
        }
        ksort($byDay);

        $longDate = fn(string $ymd) => date('j F Y', strtotime($ymd));
        if (count($byDay) <= 1) {
            $collected = 'on ' . $e($date);
            $spanNote  = '';
        } else {
            $days  = array_keys($byDay);
            $split = [];
            foreach ($byDay as $day => $n) { $split[] = $n . ' on ' . $longDate($day); }
            $collected = sprintf('between %s and %s',
                $e($longDate($days[0])), $e($longDate((string) end($days))));
            $spanNote = sprintf(
                ' Answers were not all collected on one day (%s): an interrupted run was '
                . 'completed later using the retry path. Assistants vary more between two runs '
                . 'an hour apart than they do across a day, so the span does not affect how '
                . 'these numbers should be read.',
                $e(implode(', ', $split)));
        }

        // Both of these are client-supplied prose. `service_area` exists because
        // not every client is geo-bound — a national SaaS has no state list —
        // and falls back to the state list for the ones that are. `market_summary`
        // names the subject matter the panel actually covers; without it the
        // sentence below would describe whichever vertical was written first.
        $serviceArea = trim((string) ($this->client['service_area']
            ?? implode(', ', $this->client['states'] ?? [])));
        $serviceLine = $serviceArea === '' ? '' : 'Service area: ' . $e($serviceArea);

        $market = trim((string) ($this->client['market_summary'] ?? ''));
        $marketClause = $market === '' ? '' : ' — about ' . $e($market) . ' —';
        $engineNames = array_keys($a['engines']);
        $nEngines = count($engineNames);

        // Every headline rate is quoted over questions that were actually
        // searched, never over questions asked — see aggregate().
        $g = max(1, $a['q_grounded']);
        $invPct = round($a['q_invisible'] / $g * 100);
        $citedPct = round($a['q_any_cited'] / $g * 100);

        // Shown only when it happened, so a clean run reads no differently
        // than it did before this distinction existed.
        // Gated on *answers*, not questions: one assistant can skip searching
        // while another searches, which leaves "no search" cells in the question
        // table even though no question was held out. The cells must never
        // appear unexplained.
        $noSearchMethod = $a['ungrounded_answers'] === 0 ? '' :
            'Assistants decide for themselves whether a question warrants a web search; when one '
            . 'answers from memory instead, that answer is reported as <span class="unk">no '
            . 'search</span> and excluded from the rates above, because it measures the model\'s '
            . 'training data rather than what is findable about you today. ';

        $unmeasuredNote = $a['q_unmeasured'] === 0 ? '' : sprintf(
            '<p class="muted">A further <strong>%d</strong> of the %d questions we asked are '
            . 'excluded from these rates: every assistant answered them from memory without '
            . 'searching the web, so they measure the assistant\'s training data rather than '
            . 'your visibility. They are marked <span class="unk">no search</span> in the '
            . 'question table.</p>',
            $a['q_unmeasured'], $a['questions']);

        $assistantWord = $nEngines === 1 ? 'assistant' : 'assistants';
        $engineLabels = implode(', ', array_map(
            fn($k) => ucfirst($k) . ' (' . $a['engines'][$k]['model'] . ')', $engineNames));

        // ---- per-assistant block (only meaningful with >1)
        $engineBlock = '';
        if ($nEngines > 1) {
            $rows = '';
            foreach ($a['engines'] as $en) {
                $searched = max(0, $en['total'] - $en['ungrounded']);
                $p = round($en['own'] / max(1, $searched) * 100);
                $rows .= sprintf(
                    '<tr><td><strong>%s</strong><br><span class="muted">%s</span></td>'
                    . '<td class="num">%d</td><td class="num">%d</td><td class="num">%d</td>'
                    . '<td><div class="bar"><span style="width:%d%%"></span></div></td>'
                    . '<td class="num">%d%%</td></tr>',
                    $e(ucfirst($en['engine'])), $e($en['model']),
                    $searched, $en['ungrounded'], $en['own'], $p, $p);
            }
            $engineBlock = '<h2>Result by assistant</h2>'
                . '<p class="muted">Assistants disagree. A company cited by one and missed by '
                . 'another is visible but not yet authoritative. "No search" counts answers the '
                . 'assistant produced from memory without looking anything up — they are excluded '
                . 'from that assistant\'s rate.</p>'
                . '<table><thead><tr><th>Assistant</th><th class="num">Searched</th>'
                . '<th class="num">No search</th>'
                . '<th class="num">You cited</th><th>Visibility</th><th class="num">Rate</th>'
                . '</tr></thead><tbody>' . $rows . '</tbody></table>';
        }

        // ---- category rows
        $catRows = '';
        foreach ($a['by_category'] as $cat => $c) {
            $p = round($c['own'] / max(1, $c['q']) * 100);
            $catRows .= sprintf(
                '<tr><td>%s</td><td class="num">%d</td><td class="num">%d</td>'
                . '<td><div class="bar"><span style="width:%d%%"></span></div></td>'
                . '<td class="num">%d%%</td></tr>',
                $e(ucwords(str_replace('-', ' ', $cat))), $c['q'], $c['own'], $p, $p);
        }

        // ---- rivals
        $rivalRows = '';
        foreach (array_slice($a['rivals'], 0, 20) as $i => $rv) {
            $rivalRows .= sprintf(
                '<tr><td class="num">%d</td><td><strong>%s</strong><br>'
                . '<span class="muted">%s</span></td><td class="num">%d</td>'
                . '<td class="num">%d</td><td class="tight">%s</td></tr>',
                $i + 1, $e($rv['host']), $e(mb_strimwidth($rv['title'], 0, 68, '…')),
                $rv['cited'], $rv['hits'], $e(implode(', ', array_keys($rv['engines']))));
        }

        // ---- full query table, one column per assistant
        $engineHeads = '';
        foreach ($engineNames as $en) {
            $engineHeads .= '<th>' . $e(ucfirst($en)) . '</th>';
        }
        $queryRows = '';
        foreach ($a['queries'] as $qq) {
            $cells = '';
            foreach ($engineNames as $en) {
                $v = $qq['engines'][$en] ?? null;
                $cells .= match ($v) {
                    'cited'     => '<td><span class="yes">cited</span></td>',
                    'named'     => '<td><span class="part">named</span></td>',
                    'directory' => '<td><span class="part">directory</span></td>',
                    'absent'    => '<td><span class="no">absent</span></td>',
                    'ungrounded'=> '<td><span class="unk">no search</span></td>',
                    default     => '<td class="muted">—</td>',
                };
            }
            $queryRows .= sprintf('<tr><td>%s</td><td class="tight">%s</td>%s</tr>',
                $e($qq['query']), $e($qq['category']), $cells);
        }

        // ---- trend
        $historyBlock = '';
        if (count($this->history) > 1) {
            $rows = '';
            foreach ($this->history as $h) {
                $hn = max(1, (int) $h['query_count']);
                $rows .= sprintf('<tr><td>%s</td><td class="tight">%s</td><td class="num">%d</td>'
                    . '<td class="num">%d%%</td></tr>',
                    $e(date('M j, Y', strtotime($h['started_at']))), $e($h['engine']),
                    (int) $h['own_cited'], round((int) $h['own_cited'] / $hn * 100));
            }
            $historyBlock = '<h2>Trend</h2><table><thead><tr><th>Run</th><th>Assistant</th>'
                . '<th class="num">Cited</th><th class="num">Rate</th></tr></thead><tbody>'
                . $rows . '</tbody></table>';
        }

        return <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>{$e($this->client['name'])} — AI Search Visibility Audit</title>
<style>
  @page { size: letter; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 13px/1.55 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         color: #1a1f26; margin: 0 auto; max-width: 860px; padding: 28px; }
  h1 { font-size: 25px; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 { font-size: 16px; margin: 34px 0 10px; padding-bottom: 6px;
       border-bottom: 2px solid #1a1f26; letter-spacing: -0.01em; }
  .sub { color: #5c6672; margin-bottom: 26px; font-size: 13px; }
  .hero { background: #f5f7f9; border-left: 4px solid #1a1f26; padding: 18px 20px; margin: 22px 0; }
  .hero .big { font-size: 40px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; color: #b3261e; }
  .stats { display: flex; gap: 14px; margin: 20px 0; }
  .stat { flex: 1; border: 1px solid #dde2e8; padding: 13px; border-radius: 5px; }
  .stat .v { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
  .stat .l { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em;
             color: #5c6672; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { text-align: left; border-bottom: 1.5px solid #c9d0d8; padding: 7px 8px;
       font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #5c6672; }
  td { padding: 7px 8px; border-bottom: 1px solid #eef1f4; vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.tight { white-space: nowrap; font-size: 11px; color: #5c6672; }
  .muted { color: #8892a0; font-size: 11px; }
  .bar { background: #eef1f4; height: 9px; border-radius: 5px; overflow: hidden; min-width: 80px; }
  .bar span { display: block; height: 100%; background: #1a1f26; }
  .yes  { color: #0b6b3a; font-weight: 600; }
  .part { color: #8a6100; font-weight: 600; }
  .no   { color: #b3261e; font-weight: 600; }
  .unk  { color: #5c6672; font-weight: 600; font-style: italic; }
  .note { font-size: 11px; color: #5c6672; background: #f5f7f9; padding: 14px 16px;
          border-radius: 5px; margin-top: 30px; }
  .pagebreak { page-break-before: always; }
  @media print { body { padding: 0; } .stat { break-inside: avoid; } tr { break-inside: avoid; } }
</style></head><body>

<h1>{$e($this->client['name'])}</h1>
<div class="sub">AI Search Visibility Audit &middot; {$e($this->client['domain'])} &middot; {$e($date)}<br>
{$serviceLine}</div>

<div class="hero">
  <div class="big">{$invPct}%</div>
  <div style="margin-top:8px">of the questions your buyers ask AI {$assistantWord} — where the
  {$assistantWord} actually searched the web — return
  <strong>no reference to {$e($this->client['name'])} at all</strong>.</div>
</div>

<p>We asked <strong>{$a['questions']} questions</strong> that buyers in your market
actually ask{$marketClause} to
{$nEngines} AI {$assistantWord} ({$e($engineLabels)}), producing
{$a['answers']} answers. We recorded which companies each one named and cited.</p>

<div class="stats">
  <div class="stat"><div class="v">{$a['q_any_cited']}</div><div class="l">Questions where your site was cited</div></div>
  <div class="stat"><div class="v">{$a['own_answers']}</div><div class="l">Answers citing you</div></div>
  <div class="stat"><div class="v">{$a['dir_answers']}</div><div class="l">Directory-only mentions</div></div>
  <div class="stat"><div class="v">{$a['q_invisible']}</div><div class="l">Questions with no trace of you</div></div>
  <div class="stat"><div class="v">{$a['q_unmeasured']}</div><div class="l">Answered from memory, not measured</div></div>
</div>

{$unmeasuredNote}

<p><strong>Your own site was cited on {$a['q_any_cited']} of the {$a['q_grounded']} questions
the {$assistantWord} researched ({$citedPct}%).</strong> That is the number that matters. When an AI assistant answers a
buyer's question by pointing at a source, it is deciding who the credible provider is.
Appearing inside someone else's directory listing is not the same thing — that is
renting a mention rather than owning the answer.</p>

{$engineBlock}

<h2>Where you stand, by buyer intent</h2>
<table><thead><tr><th>Intent category</th><th class="num">Questions</th>
<th class="num">You cited</th><th>Visibility</th><th class="num">Rate</th></tr></thead>
<tbody>{$catRows}</tbody></table>

<h2>Who is being cited instead</h2>
<p class="muted">Domains the assistants drew on when answering your buyers' questions.
Directories, government sources and reference sites are excluded.</p>
<table><thead><tr><th class="num">#</th><th>Domain</th><th class="num">Cited</th>
<th class="num">Retrieved</th><th>Seen by</th></tr></thead>
<tbody>{$rivalRows}</tbody></table>

{$historyBlock}

<div class="pagebreak"></div>
<h2>Every question we asked</h2>
<table><thead><tr><th>Question</th><th>Category</th>{$engineHeads}</tr></thead>
<tbody>{$queryRows}</tbody></table>

<div class="note">
<strong>Method.</strong> {$a['questions']} buyer questions were put to {$nEngines} AI
{$assistantWord} — {$e($engineLabels)} — with live web search enabled, {$collected}.{$spanNote}
For each answer we recorded every source retrieved and every source actually cited.
"Cited" means the assistant attributed part of its answer to that page.
{$noSearchMethod}AI answers vary between runs and between
assistants, so this is a directional measurement of a moving target rather than a fixed
score.
</div>

</body></html>
HTML;
    }
}
