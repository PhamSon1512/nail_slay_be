import type { HonoCtx } from '../../@types';
import { asc } from 'drizzle-orm';
import { categories } from '../../models';
import { getCachedJson } from '../../utils/cache';

export async function listCategories(c: HonoCtx) {
  return getCachedJson(c.env.CACHE, 'public:categories:v1', 300, () =>
    c.var.db.select().from(categories).orderBy(asc(categories.name)).all(),
  );
}
