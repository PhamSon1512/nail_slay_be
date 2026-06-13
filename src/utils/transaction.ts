import type { DrizzleDb } from '../db';

/** D1 atomic batch — preferred over transaction() in Workers runtime. */
export async function withTransaction<T>(db: DrizzleDb, fn: (tx: DrizzleDb) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

export async function withBatch(db: DrizzleDb, statements: Parameters<DrizzleDb['batch']>[0]) {
  return db.batch(statements);
}
