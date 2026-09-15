<?php
declare(strict_types=1);

namespace Saxon\Panel\Engines;

/**
 * ChatGPT via the OpenAI Responses API with the built-in web_search tool.
 *
 * The most important engine in the panel: ChatGPT is where the largest share of
 * buyers actually ask. Until this one is running, the panel under-represents
 * real buyer behaviour no matter how many other assistants are covered.
 *
 * One structural difference worth knowing when reading reports: Anthropic and
 * Perplexity both expose the full retrieved set *and* the cited subset, so
 * "retrieved but never cited" is a meaningful state there. OpenAI exposes
 * citations (annotations) and, depending on version, the search call's sources.
 * When sources are absent, retrieved collapses to cited for this engine — so a
 * lower "retrieved" count here is an API artifact, not weaker searching.
 */
final class OpenAIEngine implements Engine
{
    /**
     * Per-million-token rates. Model IDs on the 5.6 line move around; run
     * `php panel.php models --engine=openai` to see what your key can reach.
     * Unknown models fall back to the flagship rate and are still billed
     * correctly by OpenAI — only our local estimate is affected.
     */
    private const RATES = [
        // The 5.6 line ships only as named variants — there is no bare "gpt-5.6".
        'gpt-5.6-sol'   => ['in' => 5.00,  'out' => 30.00],   // flagship
        'gpt-5.6-terra' => ['in' => 2.00,  'out' => 12.00],   // default: best cost/fidelity
        'gpt-5.6-luna'  => ['in' => 0.20,  'out' =>  1.20],   // cheapest
        'gpt-5.5'       => ['in' => 5.00,  'out' => 30.00],
        'gpt-5.4'       => ['in' => 2.50,  'out' => 15.00],
        'gpt-5'         => ['in' => 0.625, 'out' =>  5.00],
    ];

    /** Unknown model: assume the flagship rate so estimates never understate spend. */
    private const FALLBACK_RATE = ['in' => 5.00, 'out' => 30.00];

    /**
     * OpenAI bills web_search tool calls separately from tokens and does not
     * report dollar cost on the response. VERIFY before quoting client cost —
     * same caveat as the Claude adapter. Perplexity is the only engine here
     * that reports real spend.
     */
    public const ASSUMED_SEARCH_COST = 0.01;

    private string $apiKey;
    private string $baseUrl;

    public function __construct(
        private string $modelId = 'gpt-5.6-terra',
        private string $contextSize = 'medium',
        ?string $apiKey = null,
    ) {
        $key = $apiKey ?? getenv('OPENAI_API_KEY') ?: '';
        if ($key === '') {
            fwrite(STDERR, "OPENAI_API_KEY is not set.\n\n"
                . "  export OPENAI_API_KEY=\"sk-...\"\n\n"
                . "Then: php panel.php models --engine=openai   (to confirm a model ID)\n");
            exit(1);
        }
        $this->apiKey  = $key;
        $this->baseUrl = rtrim(getenv('PANEL_OPENAI_BASE_URL') ?: 'https://api.openai.com', '/');
    }

    public function name(): string { return 'openai'; }
    public function model(): string { return $this->modelId; }

    /** Used by the `models` command to de-risk the model-ID guess. */
    public function listModels(): array
    {
        $ch = curl_init($this->baseUrl . '/v1/models');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => ['authorization: Bearer ' . $this->apiKey],
        ]);
        $body = (string) curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        $json = json_decode($body, true);
        if ($code >= 400 || !is_array($json)) {
            return ['error' => "HTTP $code: " . substr($body, 0, 200)];
        }
        return ['models' => array_column($json['data'] ?? [], 'id')];
    }

    public function prepare(string $query): \CurlHandle
    {
        $payload = [
            'model' => $this->modelId,
            'tools' => [[
                'type'                => 'web_search',
                'search_context_size' => $this->contextSize,
            ]],
            'input' => $query,
        ];

        $ch = curl_init($this->baseUrl . '/v1/responses');
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
            'error' => null,
        ];

        $json = json_decode($body, true);
        if (!is_array($json)) {
            $out['error'] = "unparseable response (HTTP $httpStatus): " . substr($body, 0, 300);
            return $out;
        }

        if ($httpStatus >= 400 || isset($json['error'])) {
            $msg = $json['error']['message'] ?? 'unknown API error';
            $out['error'] = "HTTP $httpStatus: " . (is_string($msg) ? $msg : json_encode($msg));
            return $out;
        }

        // Responses API uses input_tokens/output_tokens (not prompt_/completion_).
        $out['input_tokens']  = (int) ($json['usage']['input_tokens'] ?? 0);
        $out['output_tokens'] = (int) ($json['usage']['output_tokens'] ?? 0);

        if (($json['status'] ?? '') === 'incomplete') {
            $out['error'] = 'incomplete: '
                . ($json['incomplete_details']['reason'] ?? 'unspecified');
            return $out;
        }

        $urls = [];

        foreach ($json['output'] ?? [] as $item) {
            $type = $item['type'] ?? '';

            if ($type === 'web_search_call') {
                $out['searches']++;
                // Some versions attach the retrieved set to the call; use it when
                // present so surfaced-vs-cited stays meaningful for this engine.
                $action = $item['action'] ?? [];
                foreach (($action['sources'] ?? $action['results'] ?? []) as $src) {
                    $u = is_array($src) ? ($src['url'] ?? null) : (is_string($src) ? $src : null);
                    if (!is_string($u) || $u === '') { continue; }
                    $urls[$u] ??= ['title' => is_array($src) ? ($src['title'] ?? '') : '', 'cited' => false];
                }
                continue;
            }

            if ($type !== 'message') { continue; }   // skip reasoning items

            foreach ($item['content'] ?? [] as $c) {
                if (($c['type'] ?? '') !== 'output_text') { continue; }
                $out['answer'] .= $c['text'] ?? '';

                foreach ($c['annotations'] ?? [] as $ann) {
                    if (($ann['type'] ?? '') !== 'url_citation') { continue; }
                    $u = $ann['url'] ?? null;
                    if (!$u) { continue; }
                    $urls[$u] ??= ['title' => $ann['title'] ?? '', 'cited' => false];
                    $urls[$u]['cited'] = true;
                    if ($urls[$u]['title'] === '' && !empty($ann['title'])) {
                        $urls[$u]['title'] = $ann['title'];
                    }
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
        $rate = self::RATES[$this->modelId] ?? self::FALLBACK_RATE;
        return ($parsed['input_tokens']  / 1_000_000) * $rate['in']
             + ($parsed['output_tokens'] / 1_000_000) * $rate['out']
             + ($parsed['searches'] * self::ASSUMED_SEARCH_COST);
    }
}
