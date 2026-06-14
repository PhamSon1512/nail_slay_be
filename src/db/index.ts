import { drizzle } from 'drizzle-orm/d1';
import { schemaRelations } from '../models';

export function createDb(d1: D1Database, environment = 'development') {
  return drizzle(d1, {
    relations: schemaRelations,
    casing: 'snake_case',
    logger: environment === 'development',
  });
}

export type DrizzleDb = ReturnType<typeof createDb>;

/** @deprecated Use createDb() per request instead of singleton */
export const DrizzleDB = { getInstance: createDb };
