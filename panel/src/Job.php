<?php
declare(strict_types=1);

namespace Saxon\Panel;

/**
 * The worker's contract with the panel: a job file in, a result file out.
 *
 * The panel owns engine calls and verdict analysis. The caller — the BusinessPulse
 * worker — owns storage, email, and deciding what to ask. Keeping that boundary
 * in plain JSON files means neither side needs to know the other's language.
 *
 * Validation happens before any engine is constructed, so a malformed job fails
 * without spending a cent.
 */
final class Job
{
    public const RESULT_VERSION = 1;
    public const MAX_QUESTIONS  = 500;
    public const MAX_CONCURRENCY = 10;
    public const MAX_OTHER_DOMAINS = 10;

    /** Trailing entity designators, stripped to make a second alias. */
    private const LEGAL_SUFFIX =
        '/[\s,]+(l\.?l\.?c\.?|inc\.?|incorporated|corp\.?|corporation|ltd\.?|limited'
        . '|p\.?l\.?l\.?c\.?|l\.?l\.?p\.?|l\.?p\.?|p\.?c\.?)$/i';

    /**
     * @param string[] $knownEngines
     * @throws \InvalidArgumentException
     */
    public static function load(string $path, array $knownEngines): array
    {
        if (!is_file($path)) {
            throw new \InvalidArgumentException("no such file: $path");
        }
        $data = json_decode((string) file_get_contents($path), true);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('not valid JSON');
        }
        return self::normalize($data, $knownEngines);
    }

    /**
     * @param string[] $knownEngines
     * @throws \InvalidArgumentException
     */
    public static function normalize(array $data, array $knownEngines): array
    {
        $client = $data['client'] ?? null;
        if (!is_array($client)) {
            throw new \InvalidArgumentException('client is required');
        }

        $name = trim((string) ($client['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('client.name is required');
        }

        $domain = self::normalizeDomain((string) ($client['domain'] ?? ''));
        if ($domain === '') {
            throw new \InvalidArgumentException('client.domain must be a hostname');
        }

        // Other domains the business owns (optional). A business that runs two
        // sites gets cited as either one, and counting only the primary told an
        // owner their site was never cited when the other one was.
        $otherDomains = [];
        $rawOther = $client['other_domains'] ?? [];
        if (!is_array($rawOther)) {
            throw new \InvalidArgumentException('client.other_domains must be a list');
        }
        foreach (array_values($rawOther) as $i => $value) {
            $other = self::normalizeDomain(is_string($value) ? $value : '');
            if ($other === '') {
                throw new \InvalidArgumentException("client.other_domains[$i] must be a hostname");
            }
            if ($other !== $domain && !in_array($other, $otherDomains, true)) {
                $otherDomains[] = $other;
            }
        }
        if (count($otherDomains) > self::MAX_OTHER_DOMAINS) {
            throw new \InvalidArgumentException('client.other_domains exceeds ' . self::MAX_OTHER_DOMAINS);
        }

        $questions = [];
        foreach (is_array($data['questions'] ?? null) ? $data['questions'] : [] as $i => $q) {
            $text = is_array($q) ? trim((string) ($q['q'] ?? '')) : '';
            if ($text === '') {
                throw new \InvalidArgumentException("questions[$i].q is required");
            }
            $category = is_array($q) ? trim((string) ($q['c'] ?? '')) : '';
            $questions[] = ['q' => $text, 'c' => $category !== '' ? $category : 'uncategorized'];
        }
        if (!$questions) {
            throw new \InvalidArgumentException('questions must not be empty');
        }
        if (count($questions) > self::MAX_QUESTIONS) {
            throw new \InvalidArgumentException('questions exceeds ' . self::MAX_QUESTIONS);
        }

        $engines = self::strings($data['engines'] ?? []);
        if (!$engines) {
            throw new \InvalidArgumentException('engines must not be empty');
        }
        foreach ($engines as $engine) {
            if (!in_array($engine, $knownEngines, true)) {
                throw new \InvalidArgumentException("unknown engine '$engine'");
            }
        }

        $models = [];
        foreach (is_array($data['models'] ?? null) ? $data['models'] : [] as $engine => $model) {
            if (is_string($model) && trim($model) !== '') {
                $models[(string) $engine] = trim($model);
            }
        }

        return [
            'client' => [
                'name'              => $name,
                'domain'            => $domain,
                'other_domains'     => $otherDomains,
                'aliases'           => self::strings($client['aliases'] ?? []),
                'directory_domains' => self::strings($client['directory_domains'] ?? []),
                'reference_domains' => self::strings($client['reference_domains'] ?? []),
            ],
            'questions'   => $questions,
            'engines'     => $engines,
            'models'      => $models,
            'concurrency' => max(1, min(self::MAX_CONCURRENCY, (int) ($data['concurrency'] ?? 4))),
        ];
    }

    /**
     * Analyzer input for a job's client.
     *
     * Name detection only matches aliases, so the business name is always one.
     * A name like "East Coast Utility, LLC" also gets "East Coast Utility",
     * because assistants rarely repeat the entity designator. Stripped names
     * shorter than 4 characters are skipped — "ECU" would match too much.
     */
    public static function analyzerProfile(array $client): array
    {
        $aliases   = $client['aliases'] ?? [];
        $aliases[] = $client['name'];

        $base = trim((string) preg_replace(self::LEGAL_SUFFIX, '', $client['name']));
        if ($base !== $client['name'] && mb_strlen($base) >= 4) {
            $aliases[] = $base;
        }

        return [
            'domain'            => $client['domain'],
            'other_domains'     => $client['other_domains'] ?? [],
            'aliases'           => array_values(array_unique($aliases)),
            'directory_domains' => $client['directory_domains'] ?? [],
            'reference_domains' => $client['reference_domains'] ?? [],
        ];
    }

    /**
     * Assemble the result document from the rows the runner produced.
     *
     * `cited_questions` counts a question once no matter how many engines cited
     * the client — that is the headline number, and double-counting it across
     * engines would inflate every multi-engine report.
     */
    public static function result(array $job, array $rows, string $startedAt, string $finishedAt): array
    {
        $engines = [];
        $cited   = [];
        $named   = [];
        $answers = 0;
        $errors  = 0;
        $cost    = 0.0;

        foreach ($rows as $row) {
            $engine = (string) $row['engine'];
            $engines[$engine] ??= [
                'engine'   => $engine,
                'model'    => (string) ($row['model'] ?? ''),
                'answers'  => 0,
                'errors'   => 0,
                'cited'    => 0,
                'cost_usd' => 0.0,
            ];

            $rowCost = (float) ($row['cost_usd'] ?? 0);
            $cost += $rowCost;
            $engines[$engine]['cost_usd'] += $rowCost;

            if (!empty($row['error'])) {
                $errors++;
                $engines[$engine]['errors']++;
                continue;
            }

            $answers++;
            $engines[$engine]['answers']++;
            if (!empty($row['own_cited'])) {
                $engines[$engine]['cited']++;
                $cited[$row['query']] = true;
            }
            if (!empty($row['name_mentioned'])) {
                $named[$row['query']] = true;
            }
        }

        foreach ($engines as &$summary) {
            $summary['cost_usd'] = round($summary['cost_usd'], 6);
        }
        unset($summary);

        return [
            'version'     => self::RESULT_VERSION,
            'client'      => ['name' => $job['client']['name'], 'domain' => $job['client']['domain']],
            'started_at'  => $startedAt,
            'finished_at' => $finishedAt,
            'totals'      => [
                'questions'       => count($job['questions']),
                'answers'         => $answers,
                'errors'          => $errors,
                'cited_questions' => count($cited),
                'named_questions' => count($named),
                'cost_usd'        => round($cost, 6),
            ],
            'engines'     => array_values($engines),
            'results'     => array_values($rows),
        ];
    }

    /**
     * Write the result atomically. The worker reads this file only after the
     * process exits, but a killed process must never leave a half-written one
     * that parses as valid-but-truncated.
     *
     * @throws \RuntimeException|\JsonException
     */
    public static function write(string $path, array $doc): void
    {
        $json = json_encode(
            $doc,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            // Answers are third-party text; one bad byte must not lose the whole run.
            | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR
        );

        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException("cannot create directory $dir");
        }

        $tmp = $path . '.tmp-' . bin2hex(random_bytes(4));
        if (file_put_contents($tmp, $json) === false) {
            throw new \RuntimeException("cannot write $tmp");
        }
        if (!rename($tmp, $path)) {
            @unlink($tmp);
            throw new \RuntimeException("cannot move result into place at $path");
        }
    }

    /** Lowercase hostname with no scheme, path, port or leading "www."; '' if unusable. */
    public static function normalizeDomain(string $input): string
    {
        $value = strtolower(trim($input));
        if ($value === '') {
            return '';
        }
        if (!str_contains($value, '://')) {
            $value = 'http://' . $value;
        }

        $host = parse_url($value, PHP_URL_HOST);
        if (!is_string($host)) {
            return '';
        }
        $host = (string) preg_replace('/^www\./', '', rtrim($host, '.'));

        return str_contains($host, '.') && preg_match('/^[a-z0-9.-]+$/', $host) === 1 ? $host : '';
    }

    /** @return string[] trimmed, non-empty, unique strings from a JSON array */
    private static function strings(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $item) {
            if (is_string($item) && trim($item) !== '') {
                $out[] = trim($item);
            }
        }
        return array_values(array_unique($out));
    }
}
