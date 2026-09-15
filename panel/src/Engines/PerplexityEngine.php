<?php
declare(strict_types=1);

namespace Saxon\Panel\Engines;

/**
 * Perplexity Sonar.
 *
 * The most important engine to cover after Claude: Perplexity is a search
 * product first, so its answers are the closest available analogue to "what a
 * buyer sees when they ask an AI who does this work."
 *
 * It maps cleanly onto the surfaced/cited split the Analyzer expects:
 *   search_results[] -> every page retrieved   (surfaced)
 *   citations[]      -> pages actually used    (cited)
 *
 * Cost is taken from usage.cost.total_cost when the API reports it, so unlike
 * the Claude adapter there is no assumed per-search fee to verify.
 */
final class PerplexityEngine implements Engine
{
    /** Per-million-token rates, used only if the API omits usage.cost. */
    private const RATES = [
        'sonar'                => ['in' => 1.00, 'out' =>  1.00],
        'sonar-pro'            => ['in' => 3.00, 'out' => 15.00],
        'sonar-reasoning-pro'  => ['in' => 2.00, 'out' =>  8.00],
        'sonar-deep-research'  => ['in' => 2.00, 'out' =>  8.00],
    ];

    /** Fallback per-request search fee if usage.cost is absent (docs: $5–12 per 1k). */
    public const ASSUMED_REQUEST_FEE = 0.008;

    private string $apiKey;
    private string $endpoint;

    public function __construct(
        private string $modelId = 'sonar',
        ?string $apiKey = null,
    ) {
        $key = $apiKey ?? getenv('PERPLEXITY_API_KEY') ?: '';
        if ($key === '') {
            fwrite(STDERR, "PERPLEXITY_API_KEY is not set.\n\n"
                . "  export PERPLEXITY_API_KEY=\"pplx-...\"\n\n"
                . "Get one at https://www.perplexity.ai/settings/api\n");
            exit(1);
        }
        $this->apiKey = $key;

        // Canonical endpoint per docs.perplexity.ai/docs/sonar/quickstart.
        // Overridable because Perplexity has moved this path before:
        //   PANEL_PERPLEXITY_ENDPOINT=https://api.perplexity.ai/chat/completions
        $this->endpoint = getenv('PANEL_PERPLEXITY_ENDPOINT')
            ?: 'https://api.perplexity.ai/v1/sonar';
    }

    public function name(): string { return 'perplexity'; }
    public function model(): string { return $this->modelId; }

    public function prepare(string $query): \CurlHandle
    {
        $payload = [
            'model'    => $this->modelId,
            'messages' => [[
                'role'    => 'user',
                'content' => $query,
            ]],
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
                'authorization: Bearer ' . $this->apiKey,
            ],
        ]);

        return $ch;
    }

    public function parse(string $body, int $httpStatus): array
    {
        $out = [
            'answer' => '', 'sources' => [],
            'input_tokens' => 0, 'output_tokens' => 0, 'searches' => 0,
            'error' => null, 'reported_cost' => null,
        ];

        $json = json_decode($body, true);
        if (!is_array($json)) {
            $out['error'] = "unparseable response (HTTP $httpStatus): " . substr($body, 0, 300);
            return $out;
        }

        if ($httpStatus >= 400) {
            // Perplexity returns errors as {error: {message}} or {detail: ...}
            $msg = $json['error']['message']
                ?? $json['error']
                ?? $json['detail']
                ?? 'unknown API error';
            $out['error'] = "HTTP $httpStatus: " . (is_string($msg) ? $msg : json_encode($msg));
            return $out;
        }

        $out['answer'] = (string) ($json['choices'][0]['message']['content'] ?? '');
        $out['input_tokens']  = (int) ($json['usage']['prompt_tokens'] ?? 0);
        $out['output_tokens'] = (int) ($json['usage']['completion_tokens'] ?? 0);

        // The API reports actual spend — prefer it over our rate table.
        if (isset($json['usage']['cost']['total_cost'])) {
            $out['reported_cost'] = (float) $json['usage']['cost']['total_cost'];
        }

        // One grounded request == one search, for reporting parity with Claude.
        $out['searches'] = 1;

        // Everything retrieved.
        $urls = [];
        foreach ($json['search_results'] ?? [] as $res) {
            $u = $res['url'] ?? null;
            if (!$u) { continue; }
            $urls[$u] = ['title' => $res['title'] ?? '', 'cited' => false];
        }

        // Everything actually cited. `citations` is a flat array of URL strings;
        // older responses may omit it, newer ones may carry objects.
        foreach ($json['citations'] ?? [] as $cite) {
            $u = is_array($cite) ? ($cite['url'] ?? null) : $cite;
            if (!is_string($u) || $u === '') { continue; }
            $urls[$u] ??= ['title' => is_array($cite) ? ($cite['title'] ?? '') : '', 'cited' => false];
            $urls[$u]['cited'] = true;
        }

        // If the response gave citations only (no search_results), those URLs are
        // still the sources — nothing is lost, they just carry no title.
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
        if (isset($parsed['reported_cost'])) {
            return (float) $parsed['reported_cost'];
        }
        $rate = self::RATES[$this->modelId] ?? self::RATES['sonar'];
        return ($parsed['input_tokens']  / 1_000_000) * $rate['in']
             + ($parsed['output_tokens'] / 1_000_000) * $rate['out']
             + self::ASSUMED_REQUEST_FEE;
    }
}
