import type { HonoCtx } from '../../@types';
import { asc } from 'drizzle-orm';
import { categories } from '../../models';

export async function listCategories(c: HonoCtx) {
  return c.var.db.select().from(categories).orderBy(asc(categories.name)).all();
}
