<?php
declare(strict_types=1);

namespace Saxon\Panel;

final class Retry
{
    /**
     * Some 4xx/429 responses are hopeless — exhausted credits, a dead key, a bad
     * model ID. A 429 in particular means two very different things: "slow down"
     * (worth retrying) or "you are out of credits" (retrying turns a 3-second
     * failure into a 20-minute one across a full panel).
     *
     * Detect the hopeless cases by the provider's own error markers.
     */
    public static function isPermanentFailure(string $body): bool
    {
        if ($body === '') { return false; }

        static $needles = [
            'insufficient_quota',           // OpenAI billing
            'no credits remaining',         // OpenAI
            'billing_hard_limit',           // OpenAI
            'exceeded your current quota',  // OpenAI
            'credit balance is too low',    // Anthropic
            'api_key_invalid',              // Google
            'permission_denied',            // Google (key not enabled for the API, billing off)
            'invalid_api_key',
            'authentication_error',
            'permission_error',
            'model_not_found',
        ];

        $haystack = strtolower($body);
        foreach ($needles as $n) {
            if (str_contains($haystack, $n)) { return true; }
        }
        return false;
    }
}
