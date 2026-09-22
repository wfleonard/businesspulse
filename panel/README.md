# Visibility Panel

Asks AI assistants the questions a business's buyers ask, and records whether the
business was cited, named, reached only through a directory, or absent — and who was
cited instead.

**This is the only copy of the engine.** Fix bugs and add engines here.
`SaxonAEO/visibility-panel` holds client profiles and audit data only, and runs this
code through its `./panel` wrapper.

## For the BusinessPulse worker: `job`

```bash
php panel/panel.php job --in=job.json --out=result.json
```

Reads a job file, runs every question against every listed engine, and writes a
result file. No SQLite. `client.other_domains` (optional) lists other sites the business
runs; their citations count as its own and they never appear as rivals. Contract and field list: `docs/aeo-build-spec.md`, Section
5.2. A 3-question example: `examples/snapshot-job.json`.

| Exit | Meaning |
|---|---|
| 0 | Result written. Individual questions may still carry an `error`. |
| 1 | Missing API key, or the result could not be written |
| 2 | Bad invocation or invalid job file — nothing was spent |

Keys come from the environment: `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `GEMINI_API_KEY`. Only the engines a job names are constructed, so a
Perplexity-only snapshot needs only that key.

## Local audits

`run`, `retry`, `report`, `reclassify`, `runs`, and `queries` read client profiles
from `$PANEL_HOME/clients/`, store runs in `$PANEL_HOME/data/`, and write reports to
`$PANEL_HOME/out/`. `PANEL_HOME` defaults to this folder, where all three are absent
and ignored by git. Local audits run from SaxonAEO:

```bash
/Users/saxon/SaxonAEO/visibility-panel/panel runs
```

Full usage, measured costs, and engine notes: `SaxonAEO/visibility-panel/README.md`.

## Tests

Offline — no keys, no network, no spend:

```bash
php panel/tests/smoke.php   # engine parsing, analyzer verdicts, reports, retry
php panel/tests/job.php     # job validation, result assembly, file writing, exit codes
```
