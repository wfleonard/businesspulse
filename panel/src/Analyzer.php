<?php
declare(strict_types=1);

namespace Saxon\Panel;

/**
 * Turns one engine answer into the four facts that matter:
 *
 *   own_cited      the client's own site was a source          <- the goal
 *   name_mentioned the brand was named in the prose            <- partial credit
 *   directory_only reachable only through someone else's list  <- renting, not owning
 *   rivals         whose sites got cited instead               <- the sales weapon
 */
final class Analyzer
{
    private string $domain;
    /** @var string[] */ private array $aliases;
    /** @var string[] */ private array $directories;
    /** @var string[] */ private array $references;

    public function __construct(array $client)
    {
        $this->domain      = $this->host($client['domain']);
        $this->aliases     = $client['aliases'] ?? [];
        $this->directories = array_map([$this, 'host'], $client['directory_domains'] ?? []);
        $this->references  = array_map([$this, 'host'], $client['reference_domains'] ?? []);
    }

    public function analyze(array $parsed): array
    {
        $ownCited      = false;
        $ownRank       = null;
        $viaDirectory  = false;
        $rivals        = [];
        $position      = 0;

        foreach ($parsed['sources'] ?? [] as $src) {
            $position++;
            $host = $this->host($src['url'] ?? '');
            if ($host === '') { continue; }

            if ($this->matches($host, $this->domain)) {
                $ownCited = true;
                $ownRank ??= $position;
                continue;
            }

            if ($this->inList($host, $this->directories)) {
                // A directory result only counts as "reaching" the client if the
                // brand is actually named somewhere in the answer.
                $viaDirectory = true;
                continue;
            }

            if ($this->inList($host, $this->references)) {
                continue; // gov / encyclopedic / trade reference — not a rival
            }

            $rivals[$host] ??= ['host' => $host, 'title' => $src['title'] ?? '', 'cited' => false];
            if (!empty($src['cited'])) {
                $rivals[$host]['cited'] = true;
            }
        }

        $nameMentioned = $this->namedIn($parsed['answer'] ?? '');

        return [
            'own_cited'      => $ownCited,
            'own_rank'       => $ownRank,
            'name_mentioned' => $nameMentioned,
            // All three conditions are load-bearing: the brand was named, their
            // own site was NOT a source, and a directory WAS — so the mention
            // most likely came through someone else's listing.
            //
            // Requiring $nameMentioned matters. A directory domain merely
            // appearing in results (e.g. a BBB category page) is not evidence
            // the client is listed on it, and treating it as such would inflate
            // "directory-only" in every audit.
            'directory_only' => !$ownCited && $nameMentioned && $viaDirectory,
            'rivals'         => array_values($rivals),
        ];
    }

    private function namedIn(string $text): bool
    {
        if ($text === '') { return false; }
        foreach ($this->aliases as $alias) {
            if ($alias === '') { continue; }
            // Collapse whitespace differences so "East  Coast Utility" still hits.
            $pattern = '/\b' . preg_replace('/\s+/', '\s+', preg_quote($alias, '/')) . '\b/i';
            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }
        return false;
    }

    /** True when $host is the target domain or a subdomain of it. */
    private function matches(string $host, string $target): bool
    {
        return $host === $target || str_ends_with($host, '.' . $target);
    }

    private function inList(string $host, array $list): bool
    {
        foreach ($list as $d) {
            if ($d !== '' && $this->matches($host, $d)) { return true; }
        }
        return false;
    }

    private function host(string $urlOrHost): string
    {
        $h = $urlOrHost;
        if (str_contains($h, '://')) {
            $h = parse_url($h, PHP_URL_HOST) ?: '';
        }
        $h = strtolower(trim($h));
        return preg_replace('/^www\./', '', $h) ?? '';
    }
}
