# Visibility Panel

Asks AI assistants the questions a business's buyers ask, and records whether the
business was cited, named, reached only through a directory, or absent — and who was
cited instead.

Copied from `/Users/saxon/SaxonAEO/visibility-panel` on 2026-09-15 for the
BusinessPulse AEO build. That copy still runs local client audits; see Open
Decision 1 in `docs/aeo-build-spec.md` for which copy is canonical.

## For the BusinessPulse worker: `job`

```bash
php panel/panel.php job --in=job.json --out=result.json
```

Reads a job file, runs every question against every listed engine, and writes a
result file. No SQLite. Contract and field list: `docs/aeo-build-spec.md`, Section
5.2. A 3-question example: `examples/snapshot-job.json`.

| Exit | Meaning |
|---|---|
| 0 | Result written. Individual questions may still carry an `error`. |
| 1 | Missing API key, or the result could not be written |
| 2 | Bad invocation or invalid job file — nothing was spent |

Keys come from the environment: `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`.

## Local audits

`run`, `retry`, `report`, `reclassify`, `runs`, and `queries` work as in the SaxonAEO
copy. They read client profiles from `clients/` and store runs in `data/` — both
absent here and ignored by git.

## Tests

Offline — no keys, no network, no spend:

```bash
php panel/tests/smoke.php   # engine parsing, analyzer verdicts, reports, retry
php panel/tests/job.php     # job validation, result assembly, file writing, exit codes
```
