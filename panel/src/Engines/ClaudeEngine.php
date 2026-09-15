<?php
declare(strict_types=1);

namespace Saxon\Panel\Engines;

/**
 * Claude with the server-side web_search tool.
 *
 * This is the engine you can run today with the key you already have. Treat it
 * as a proxy for AI search visibility, not the whole picture: buyers mostly use
 * ChatGPT, Perplexity, Gemini and Google's AI Overviews. It is directionally
 * valid because every one of those pulls from a similar web index and rewards
 * similar signals, but wire up the other adapters before you quote a headline
 * number to a client as "AI search visibility" without qualification.
 */
final class ClaudeEngine implements Engine
{
    // Per-million-token rates. Verify against current pricing before invoicing.
    private const RATES = [
        'claude-sonnet-5'  => ['in' => 3.00,  'out' => 15.00],
        'claude-opus-5'    => ['in' => 5.00,  'out' => 25.00],
        'claude-haiku-4-5' => ['in' => 1.00,  'out' =>  5.00],
    ];

    /**
     * Anthropic bills the web_search tool per call on top of tokens.
     * VERIFY THIS RATE against current pricing — it is an assumption, and it
     * dominates panel cost. Reports label it as assumed.
     */
    public const ASSUMED_SEARCH_COST = 0.01;

    private string $apiKey;
    private string $baseUrl;

    public function __construct(
        private string $modelId = 'claude-sonnet-5',
        private int $maxSearches = 5,
        private string $effort = 'medium',
        ?string $apiKey = null,
    ) {
        $key = $apiKey ?? getenv('ANTHROPIC_API_KEY') ?: '';
        if ($key === '') {
            fwrite(STDERR, "ANTHROPIC_API_KEY is not set.\n\n"
                . "  export ANTHROPIC_API_KEY=\"sk-ant-...\"\n\n"
                . "You already have a key in wp-config.php as MUNIREPORTS_ANTHROPIC_API_KEY.\n");
            exit(1);
        }
        $this->apiKey = $key;

        // Deliberately NOT ANTHROPIC_BASE_URL — the Claude Code environment sets
        // that for its own use and inheriting it here produces baffling failures.
        $this->baseUrl = rtrim(getenv('PANEL_ANTHROPIC_BASE_URL') ?: 'https://api.anthropic.com', '/');
    }

    public function name(): string { return 'claude'; }
    public function model(): string { return $this->modelId; }

    public function prepare(string $query): \CurlHandle
    {
        $payload = [
            'model'      => $this->modelId,
            'max_tokens' => 2000,
            // Adaptive thinking stays ON. Disabling it makes the model markedly
            // less willing to reach for tools, which would defeat the whole
            // measurement. Cost is controlled with effort instead.
            'output_config' => ['effort' => $this->effort],
            'tools' => [[
                'type'     => 'web_search_20260209',
                'name'     => 'web_search',
                'max_uses' => $this->maxSearches,
            ]],
            'messages' => [[
                'role'    => 'user',
                'content' => $query,
            ]],
        ];

        $ch = curl_init($this->baseUrl . '/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 300,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_SLASHES),
            CURLOPT_HTTPHEADER     => [
                'content-type: application/json',
                'x-api-key: ' . $this->apiKey,
                'anthropic-version: 2023-06-01',
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

        if ($httpStatus >= 400 || ($json['type'] ?? '') === 'error') {
            $msg = $json['error']['message'] ?? 'unknown API error';
            $out['error'] = "HTTP $httpStatus: $msg";
            return $out;
        }

        $out['input_tokens']  = (int) ($json['usage']['input_tokens'] ?? 0);
        $out['output_tokens'] = (int) ($json['usage']['output_tokens'] ?? 0);

        // A safety decline is a legitimate outcome, not a crash. Record and move on.
        if (($json['stop_reason'] ?? '') === 'refusal') {
            $out['error'] = 'refusal: ' . ($json['stop_details']['category'] ?? 'unspecified');
            return $out;
        }

        // urls keyed by url => ['title'=>..,'cited'=>bool]. Surfaced first, then
        // upgraded to cited when a text block actually attributes to them.
        $urls = [];

        foreach ($json['content'] ?? [] as $block) {
            $type = $block['type'] ?? '';

            if ($type === 'text') {
                $out['answer'] .= $block['text'] ?? '';
                foreach ($block['citations'] ?? [] as $cite) {
                    $u = $cite['url'] ?? null;
                    if (!$u) { continue; }
                    $urls[$u] ??= ['title' => $cite['title'] ?? '', 'cited' => false];
                    $urls[$u]['cited'] = true;
                    if (($urls[$u]['title'] ?? '') === '' && !empty($cite['title'])) {
                        $urls[$u]['title'] = $cite['title'];
                    }
                }
                continue;
            }

            if ($type === 'server_tool_use' && ($block['name'] ?? '') === 'web_search') {
                $out['searches']++;
                continue;
            }

            if ($type === 'web_search_tool_result') {
                $content = $block['content'] ?? [];
                // Errors arrive as a single object, successes as a list.
                if (isset($content['type']) && $content['type'] === 'web_search_tool_result_error') {
                    $out['error'] = 'search error: ' . ($content['error_code'] ?? 'unknown');
                    continue;
                }
                foreach ($content as $res) {
                    if (($res['type'] ?? '') !== 'web_search_result') { continue; }
                    $u = $res['url'] ?? null;
                    if (!$u) { continue; }
                    $urls[$u] ??= ['title' => $res['title'] ?? '', 'cited' => false];
                }
            }
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
        $rate = self::RATES[$this->modelId] ?? self::RATES['claude-sonnet-5'];
        $tokenCost = ($parsed['input_tokens'] / 1_000_000) * $rate['in']
                   + ($parsed['output_tokens'] / 1_000_000) * $rate['out'];
        return $tokenCost + ($parsed['searches'] * self::ASSUMED_SEARCH_COST);
    }
}
