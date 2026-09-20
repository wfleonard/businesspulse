<?php
declare(strict_types=1);

namespace Saxon\Panel\Engines;

/**
 * Gemini with Grounding with Google Search, through the Interactions API.
 *
 * The engine that matters most for a local-service business: the buyer is
 * already in Google's world, and a grounded Gemini answer is the closest
 * available read on what Google's models say when asked who does this work.
 *
 * One difference from every other engine here, and it changes what the report
 * can claim: Gemini returns only what it *cited*. The search step hands back an
 * HTML suggestion widget, not the result list, so "retrieved but never cited" —
 * indexed and findable, yet not worth quoting — is invisible on this engine.
 * Every source it reports is cited. Read a low Gemini source count as "few
 * pages earned a citation", never as "few pages were found".
 *
 * Cost: tokens, plus $14 per 1,000 search queries the model chooses to run
 * (Gemini 3 bills per query, not per prompt). The first 5,000 grounded searches
 * each month are free across all Gemini 3.x models, which costOf() cannot see —
 * so at snapshot volumes the real bill is lower than what this reports.
 *
 * Grounding needs a PAID-TIER key, and a free-tier one fails misleadingly: every
 * grounded question returns HTTP 429 "You exceeded your current quota", which
 * reads like rate limiting, while an ungrounded call to the same key returns
 * 200. Enable billing on the key's Google Cloud project. (Measured 2026-09-20.)
 */
final class GeminiEngine implements Engine
{
    /** Per-million-token rates, paid tier. Output covers thinking tokens too. */
    private const RATES = [
        'gemini-3.8-flash'      => ['in' => 0.75, 'out' => 3.75],
        'gemini-3.7-flash'      => ['in' => 0.75, 'out' => 3.75],
        'gemini-3.6-flash'      => ['in' => 0.75, 'out' => 3.75],
        'gemini-3.5-flash'      => ['in' => 1.50, 'out' => 9.00],
        'gemini-3.5-flash-lite' => ['in' => 0.30, 'out' => 2.50],
        'gemini-3.1-flash-lite' => ['in' => 0.25, 'out' => 1.50],
    ];

    /** $14 per 1,000 grounded search queries, past the monthly free allowance. */
    public const SEARCH_COST = 0.014;

    /**
     * Pinned like anthropic-version: the Interactions API dates its shape, and
     * an undated request follows whatever the current revision happens to be.
     * Parsing here is written against this one.
     */
    private const API_REVISION = '2026-05-20';

    private string $apiKey;
    private string $endpoint;

    public function __construct(
        private string $modelId = 'gemini-3.8-flash',
        private string $thinkingLevel = 'medium',
        ?string $apiKey = null,
    ) {
        $key = $apiKey ?? getenv('GEMINI_API_KEY') ?: '';
        if ($key === '') {
            fwrite(STDERR, "GEMINI_API_KEY is not set.\n\n"
                . "  export GEMINI_API_KEY=\"...\"\n\n"
                . "Get one at https://aistudio.google.com/apikey\n");
            exit(1);
        }
        $this->apiKey = $key;

        $this->endpoint = getenv('PANEL_GEMINI_ENDPOINT')
            ?: 'https://generativelanguage.googleapis.com/v1beta/interactions';
    }

    public function name(): string { return 'gemini'; }
    public function model(): string { return $this->modelId; }

    public function prepare(string $query): \CurlHandle
    {
        $payload = [
            'model' => $this->modelId,
            'input' => $query,
            'tools' => [['type' => 'google_search']],
            // No max_output_tokens: thinking spends the same budget, and a
            // truncated answer would read as an absent business.
            'generation_config' => ['thinking_level' => $this->thinkingLevel],
        ];

        $ch = curl_init($this->endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 300,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_SLASHES),
            CURLOPT_HTTPHEADER     => [
                'content-type: application/json',
                'x-goog-api-key: ' . $this->apiKey,
                'api-revision: ' . self::API_REVISION,
            ],
        ]);

        return $ch;
    }

    public function parse(string $body, int $httpStatus): array
    {
        $out = [
            'answer' => '', 'sources' => [],
            'input_tokens' => 0, 'output_tokens' => 0, 'searches' => 0,
            'error' => null,
        ];

        $json = json_decode($body, true);
        if (!is_array($json)) {
            $out['error'] = "unparseable response (HTTP $httpStatus): " . substr($body, 0, 300);
            return $out;
        }

        if ($httpStatus >= 400) {
            $msg = $json['error']['message'] ?? $json['error']['status'] ?? 'unknown API error';
            $out['error'] = "HTTP $httpStatus: " . (is_string($msg) ? $msg : json_encode($msg));
            return $out;
        }

        $usage = $json['usage'] ?? [];
        $out['input_tokens'] = (int) ($usage['total_input_tokens'] ?? 0);
        // Thinking is billed at the output rate and reported apart from it, so
        // the two are added here rather than in costOf().
        $out['output_tokens'] = (int) ($usage['total_output_tokens'] ?? 0)
                              + (int) ($usage['total_thought_tokens'] ?? 0);

        $urls = [];
        $searchFailed = false;

        foreach ($json['steps'] ?? [] as $step) {
            $type = $step['type'] ?? '';

            if ($type === 'model_output') {
                foreach ($step['content'] ?? [] as $block) {
                    if (($block['type'] ?? '') !== 'text') { continue; }
                    $out['answer'] .= $block['text'] ?? '';
                    foreach ($block['annotations'] ?? [] as $note) {
                        if (($note['type'] ?? '') !== 'url_citation') { continue; }
                        $u = $note['url'] ?? null;
                        if (!is_string($u) || $u === '') { continue; }
                        // Title is usually the bare host ("uefa.com"), not a page title.
                        $urls[$u] ??= ['title' => $note['title'] ?? '', 'cited' => true];
                    }
                }
                continue;
            }

            // Billing counts each query, not each call, and ignores empty ones.
            if ($type === 'google_search_call') {
                foreach ($step['arguments']['queries'] ?? [] as $q) {
                    if (is_string($q) && trim($q) !== '') { $out['searches']++; }
                }
                continue;
            }

            if ($type === 'google_search_result' && ($step['is_error'] ?? false)) {
                $searchFailed = true;
            }
        }

        // The count the API billed, when it reports one, beats our tally of steps.
        foreach ($usage['grounding_tool_count'] ?? [] as $count) {
            if (($count['type'] ?? '') === 'google_search') {
                $out['searches'] = (int) ($count['count'] ?? $out['searches']);
            }
        }

        // An interaction that didn't finish has no answer worth analyzing.
        $status = (string) ($json['status'] ?? 'completed');
        if ($status !== 'completed' || $out['answer'] === '') {
            $reason = $json['errors'][0]['message']
                ?? ($searchFailed ? 'google search failed' : null);
            if ($status !== 'completed') {
                $out['error'] = "interaction $status" . ($reason ? ": $reason" : '');
            } elseif ($out['answer'] === '') {
                $out['error'] = 'empty answer' . ($reason ? ": $reason" : '');
            }
            return $out;
        }

        foreach ($urls as $url => $meta) {
            $out['sources'][] = [
                'url'   => $url,
                'title' => $meta['title'],
                'cited' => $meta['cited'],
            ];
        }

        return $out;
    }

    public function costOf(array $parsed): float
    {
        $rate = self::RATES[$this->modelId] ?? self::RATES['gemini-3.8-flash'];
        return ($parsed['input_tokens']  / 1_000_000) * $rate['in']
             + ($parsed['output_tokens'] / 1_000_000) * $rate['out']
             + ($parsed['searches'] * self::SEARCH_COST);
    }
}
