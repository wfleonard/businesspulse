<?php
declare(strict_types=1);

namespace Saxon\Panel;

use PDO;

/**
 * SQLite store for visibility runs.
 *
 * The time series is the point: a single run tells you where a client stands,
 * but the sequence of runs is what you show at renewal.
 */
final class Db
{
    private PDO $pdo;

    public function __construct(string $path)
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $this->pdo = new PDO('sqlite:' . $path);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->migrate();
    }

    private function migrate(): void
    {
        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS runs (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                client       TEXT    NOT NULL,
                engine       TEXT    NOT NULL,
                model        TEXT,
                started_at   TEXT    NOT NULL,
                finished_at  TEXT,
                query_count  INTEGER NOT NULL DEFAULT 0,
                error_count  INTEGER NOT NULL DEFAULT 0,
                cost_usd     REAL    NOT NULL DEFAULT 0,
                notes        TEXT
            );
        SQL);

        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS results (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id         INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
                query          TEXT    NOT NULL,
                category       TEXT,
                -- own_cited: the client's own domain appeared in the engine's sources
                own_cited      INTEGER NOT NULL DEFAULT 0,
                -- name_mentioned: the brand name appeared in the answer prose
                name_mentioned INTEGER NOT NULL DEFAULT 0,
                -- directory_only: client reachable only via a third-party listing
                directory_only INTEGER NOT NULL DEFAULT 0,
                own_rank       INTEGER,
                answer         TEXT,
                sources_json   TEXT,
                rivals_json    TEXT,
                input_tokens   INTEGER NOT NULL DEFAULT 0,
                output_tokens  INTEGER NOT NULL DEFAULT 0,
                searches       INTEGER NOT NULL DEFAULT 0,
                error          TEXT,
                created_at     TEXT    NOT NULL
            );
        SQL);

        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_results_run ON results(run_id)');
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_runs_client ON runs(client, started_at)');
    }

    public function startRun(string $client, string $engine, string $model): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO runs (client, engine, model, started_at) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$client, $engine, $model, gmdate('c')]);
        return (int) $this->pdo->lastInsertId();
    }

    public function finishRun(int $runId, int $queryCount, int $errorCount, float $costUsd): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE runs SET finished_at = ?, query_count = ?, error_count = ?, cost_usd = ? WHERE id = ?'
        );
        $stmt->execute([gmdate('c'), $queryCount, $errorCount, $costUsd, $runId]);
    }

    public function saveResult(int $runId, array $r): void
    {
        $stmt = $this->pdo->prepare(<<<'SQL'
            INSERT INTO results
                (run_id, query, category, own_cited, name_mentioned, directory_only,
                 own_rank, answer, sources_json, rivals_json,
                 input_tokens, output_tokens, searches, error, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        SQL);

        $stmt->execute([
            $runId,
            $r['query'],
            $r['category'] ?? null,
            !empty($r['own_cited']) ? 1 : 0,
            !empty($r['name_mentioned']) ? 1 : 0,
            !empty($r['directory_only']) ? 1 : 0,
            $r['own_rank'] ?? null,
            $r['answer'] ?? null,
            json_encode($r['sources'] ?? [], JSON_UNESCAPED_SLASHES),
            json_encode($r['rivals'] ?? [], JSON_UNESCAPED_SLASHES),
            $r['input_tokens'] ?? 0,
            $r['output_tokens'] ?? 0,
            $r['searches'] ?? 0,
            $r['error'] ?? null,
            gmdate('c'),
        ]);
    }

    /**
     * The failed rows of a run — the work list for `panel.php retry`.
     *
     * Returns the stored query text rather than re-reading the client profile,
     * so a retry still reproduces the original run even if the panel has been
     * edited since. A run is a record of what was asked, not a pointer to it.
     */
    public function erroredResults(int $runId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, query, category, error FROM results
             WHERE run_id = ? AND error IS NOT NULL ORDER BY id'
        );
        $stmt->execute([$runId]);
        return $stmt->fetchAll();
    }

    /**
     * Drop specific result rows. Retry deletes the failed rows before re-running
     * them, because the runner INSERTs — without this the run would end up
     * holding two rows for the same query, one of them a stale error.
     *
     * @param int[] $ids
     */
    public function deleteResults(array $ids): void
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) { return; }
        $in = implode(',', array_fill(0, count($ids), '?'));
        $this->pdo->prepare("DELETE FROM results WHERE id IN ($in)")->execute($ids);
    }

    /**
     * Recompute a run's totals from the rows it actually holds, and add the
     * incremental spend.
     *
     * Counts are derived rather than passed in: after a retry the true totals
     * are the sum of the original pass and the retry, and deriving them from
     * the table is the only version that cannot drift.  Cost is additive
     * because the money for the first attempt was genuinely spent — a retried
     * run costs what both passes cost.
     */
    public function recountRun(int $runId, float $addCost): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE runs SET
                query_count = (SELECT COUNT(*) FROM results WHERE run_id = ? AND error IS NULL),
                error_count = (SELECT COUNT(*) FROM results WHERE run_id = ? AND error IS NOT NULL),
                cost_usd    = cost_usd + ?,
                finished_at = ?
             WHERE id = ?'
        );
        $stmt->execute([$runId, $runId, $addCost, gmdate('c'), $runId]);
    }

    /**
     * Every stored result for a client, including the raw sources. This is what
     * makes classification changes free: the engine answers are kept verbatim,
     * so re-deciding what counts as a competitor never costs another API call.
     */
    public function resultsForClient(string $client): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT res.id, res.answer, res.sources_json
             FROM results res JOIN runs r ON r.id = res.run_id
             WHERE r.client = ? AND res.error IS NULL'
        );
        $stmt->execute([$client]);
        return $stmt->fetchAll();
    }

    /** Rewrite the derived verdicts for one result after re-analysis. */
    public function updateVerdict(int $resultId, array $v): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE results
             SET own_cited = ?, name_mentioned = ?, directory_only = ?,
                 own_rank = ?, rivals_json = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $v['own_cited'] ? 1 : 0,
            $v['name_mentioned'] ? 1 : 0,
            $v['directory_only'] ? 1 : 0,
            $v['own_rank'] ?? null,
            json_encode($v['rivals'] ?? [], JSON_UNESCAPED_SLASHES),
            $resultId,
        ]);
    }

    public function latestRunId(string $client): ?int
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM runs WHERE client = ? AND finished_at IS NOT NULL ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$client]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    public function run(int $runId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM runs WHERE id = ?');
        $stmt->execute([$runId]);
        return $stmt->fetch() ?: null;
    }

    public function results(int $runId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM results WHERE run_id = ? ORDER BY category, id');
        $stmt->execute([$runId]);
        return $stmt->fetchAll();
    }

    /**
     * Results across several runs, each tagged with the engine that produced it.
     * This is what makes a multi-engine audit possible — and a multi-engine
     * audit is what makes the headline number defensible.
     *
     * @param int[] $runIds
     */
    public function resultsForRuns(array $runIds): array
    {
        $runIds = array_values(array_filter(array_map('intval', $runIds)));
        if (!$runIds) { return []; }

        $in = implode(',', array_fill(0, count($runIds), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT res.*, r.engine, r.model
             FROM results res
             JOIN runs r ON r.id = res.run_id
             WHERE res.run_id IN ($in)
             ORDER BY res.category, res.query, r.engine"
        );
        $stmt->execute($runIds);
        return $stmt->fetchAll();
    }

    /** @param int[] $runIds */
    public function runs(array $runIds): array
    {
        $runIds = array_values(array_filter(array_map('intval', $runIds)));
        if (!$runIds) { return []; }
        $in = implode(',', array_fill(0, count($runIds), '?'));
        $stmt = $this->pdo->prepare("SELECT * FROM runs WHERE id IN ($in) ORDER BY id");
        $stmt->execute($runIds);
        return $stmt->fetchAll();
    }

    /** Most recent completed run per engine for a client — the default audit set. */
    public function latestRunPerEngine(string $client): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT MAX(id) AS id FROM runs
             WHERE client = ? AND finished_at IS NOT NULL
             GROUP BY engine ORDER BY engine'
        );
        $stmt->execute([$client]);
        return array_map('intval', array_column($stmt->fetchAll(), 'id'));
    }

    /** Run history for a client, oldest first — the renewal chart. */
    public function history(string $client, int $limit = 26): array
    {
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT r.id, r.started_at, r.engine, r.model, r.query_count, r.cost_usd,
                   SUM(res.own_cited)      AS own_cited,
                   SUM(res.name_mentioned) AS name_mentioned
            FROM runs r
            JOIN results res ON res.run_id = r.id
            WHERE r.client = ? AND r.finished_at IS NOT NULL
            GROUP BY r.id
            ORDER BY r.id DESC
            LIMIT ?
        SQL);
        $stmt->execute([$client, $limit]);
        return array_reverse($stmt->fetchAll());
    }

    public function listRuns(int $limit = 50): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM runs ORDER BY id DESC LIMIT ?'
        );
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
}
