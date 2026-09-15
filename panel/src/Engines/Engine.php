<?php
declare(strict_types=1);

namespace Saxon\Panel\Engines;

/**
 * An engine answers a buyer question the way a buyer would see it, and reports
 * which sources it drew on.
 *
 * Two source tiers matter and must be kept distinct:
 *   - surfaced: the engine retrieved this page during search
 *   - cited:    the engine actually attributed a claim to this page
 *
 * Being surfaced but never cited is a real and reportable state — it means the
 * page is indexed and findable but not authoritative enough to be quoted.
 */
interface Engine
{
    /** Short identifier stored on the run row, e.g. "claude". */
    public function name(): string;

    /** Model/version string for the run row. */
    public function model(): string;

    /**
     * Build a curl handle for one query. The runner drives these with
     * curl_multi so a full panel finishes in minutes rather than an hour.
     *
     * @return \CurlHandle
     */
    public function prepare(string $query): \CurlHandle;

    /**
     * Parse a raw HTTP body into a normalized shape:
     *
     *   [
     *     'answer'        => string,
     *     'sources'       => [ ['url'=>..., 'title'=>..., 'cited'=>bool], ... ],
     *     'input_tokens'  => int,
     *     'output_tokens' => int,
     *     'searches'      => int,
     *     'error'         => ?string,
     *   ]
     */
    public function parse(string $body, int $httpStatus): array;

    /** Estimated USD cost for one parsed result. */
    public function costOf(array $parsed): float;
}
