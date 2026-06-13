import { drizzle } from 'drizzle-orm/d1';
import { schemaRelations } from '../models';

export function createDb(d1: D1Database) {
  return drizzle(d1, {
    relations: schemaRelations,
    casing: 'snake_case',
    logger: true,
  });
}

export type DrizzleDb = ReturnType<typeof createDb>;

/** @deprecated Use createDb() per request instead of singleton */
export const DrizzleDB = { getInstance: createDb };
