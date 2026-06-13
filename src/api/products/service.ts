import type { HonoCtx } from '../../@types';
import type { ProductListQuerySchema } from './openapi';
import type { z } from 'zod';
import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { categories, products, productVariants } from '../../models';
import { throwError } from '../../utils';

export async function listProducts(c: HonoCtx, query: z.infer<typeof ProductListQuerySchema>) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const conditions = [isNull(products.deletedAt), eq(products.status, 'active')];

  if (query.category_slug) {
    const category = await c.var.db.select().from(categories).where(eq(categories.slug, query.category_slug)).get();
    if (!category) return { items: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    conditions.push(eq(products.categoryId, category.id));
  }

  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(or(like(products.name, term), like(products.description, term))!);
  }

  const whereClause = and(...conditions);

  const [{ count }] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .all();

  const total = Number(count ?? 0);

  let orderBy;
  switch (query.sort) {
    case 'price_asc':
      orderBy = asc(products.price);
      break;
    case 'price_desc':
      orderBy = desc(products.price);
      break;
    case 'newest':
    default:
      orderBy = desc(products.createdAt);
      break;
  }

  const items = await c.var.db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      originalPrice: products.originalPrice,
      stock: products.stock,
      imageUrls: products.imageUrls,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getProductBySlug(c: HonoCtx, slug: string) {
  const product = await c.var.db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      originalPrice: products.originalPrice,
      status: products.status,
      stock: products.stock,
      imageUrls: products.imageUrls,
      createdAt: products.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), isNull(products.deletedAt)))
    .get();

  if (!product) return throwError.notFound('Product not found', { slug });

  const variants = await c.var.db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id))
    .orderBy(productVariants.sortOrder)
    .all();

  return { ...product, variants };
}
