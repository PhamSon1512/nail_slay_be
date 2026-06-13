import Database from 'better-sqlite3';

// D1 API subset used by Drizzle ORM — enough to run all integration tests
// in a Node.js environment via better-sqlite3.
type D1Row = Record<string, unknown>;

function makePrepared(db: Database.Database, sql: string, params: unknown[] = []) {
  const stmt = {
    bind(...values: unknown[]) {
      return makePrepared(db, sql, values);
    },

    all<T = D1Row>(): Promise<{ results: T[]; success: boolean; meta: D1Row }> {
      try {
        const results = db.prepare(sql).all(...params) as T[];
        return Promise.resolve({ results, success: true, meta: {} });
      } catch (err) {
        return Promise.reject(err);
      }
    },

    run(): Promise<{ success: boolean; meta: { last_row_id: number; changes: number } }> {
      try {
        const info = db.prepare(sql).run(...params);
        return Promise.resolve({
          success: true,
          meta: {
            last_row_id: Number(info.lastInsertRowid),
            changes: info.changes,
          },
        });
      } catch (err) {
        return Promise.reject(err);
      }
    },

    first<T = D1Row>(colName?: string): Promise<T | null> {
      try {
        const row = db.prepare(sql).get(...params) as D1Row | undefined;
        if (!row) return Promise.resolve(null);
        if (colName !== undefined) return Promise.resolve((row[colName] ?? null) as T);
        return Promise.resolve(row as T);
      } catch (err) {
        return Promise.reject(err);
      }
    },

    raw<T = unknown[]>(): Promise<T[]> {
      try {
        const prepared = db.prepare(sql);
        prepared.raw(true);
        return Promise.resolve(prepared.all(...params) as T[]);
      } catch (err) {
        return Promise.reject(err);
      }
    },
  };

  return stmt;
}

/**
 * Create a D1-compatible database wrapper over an in-memory better-sqlite3 instance.
 *
 * Implements the minimal D1Database surface that Drizzle ORM's d1 driver calls:
 *   prepare → bind / all / run / first / raw
 *   exec    → run raw DDL statements
 *   batch   → parallel statement execution
 */
export function createSqliteD1(db: Database.Database) {
  return {
    prepare(sql: string) {
      return makePrepared(db, sql);
    },

    // D1's exec() runs one or more DDL statements separated by semicolons.
    // The return value is unused by tests, so sync is fine (await wraps it).
    exec(query: string) {
      const stmts = query
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const s of stmts) {
        db.prepare(s).run();
      }
      return Promise.resolve({ count: stmts.length, duration: 0 });
    },

    batch<T>(statements: ReturnType<typeof makePrepared>[]) {
      return Promise.all(statements.map((s) => s.all<T>()));
    },

    dump() {
      return Promise.resolve(new ArrayBuffer(0));
    },
  };
}
