import type { HonoCtx } from '../../@types';
import { and, desc, eq, isNull, like, sql } from 'drizzle-orm';
import { omit } from 'ramda';
import { categories, products, users } from '../../models';
import { throwError } from '../../utils';
import { collectFormFile, optionalString, requiredString } from '../../utils/formParse';
import { uploadUserFileToR2 } from '../../utils/r2Upload';
import { USER_SENSITIVE_FIELDS } from '../users/constants';

export async function adminListUsers(c: HonoCtx, query: { page?: string; limit?: string; search?: string }) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const conditions = [isNull(users.deletedAt)];
  if (query.search) conditions.push(like(users.email, `%${query.search}%`));

  const whereClause = and(...conditions);
  const [{ count }] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(whereClause)
    .all();

  const items = await c.var.db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return {
    items: items.map((u) => omit(USER_SENSITIVE_FIELDS, u)),
    pagination: { total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) },
  };
}

export async function adminGetUser(c: HonoCtx, id: string) {
  const user = await c.var.db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .get();
  if (!user) return throwError.notFound('User not found', { id });
  return omit(USER_SENSITIVE_FIELDS, user);
}

export async function adminUpdateUser(
  c: HonoCtx,
  id: string,
  input: {
    role?: string;
    fullName?: string;
    phone?: string;
    accountStatus?: 'active' | 'blocked';
    blockReason?: string;
  },
) {
  if (input.accountStatus === 'blocked' && !input.blockReason?.trim()) {
    return throwError.validation('Block reason is required when blocking a user');
  }

  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.role !== undefined) patch.role = input.role;
  if (input.fullName !== undefined) patch.fullName = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.accountStatus !== undefined) {
    patch.accountStatus = input.accountStatus;
    patch.blockReason = input.accountStatus === 'blocked' ? (input.blockReason?.trim() ?? null) : null;
    patch.blockedAt = input.accountStatus === 'blocked' ? new Date() : null;
  }

  const [updated] = await c.var.db
    .update(users)
    .set(patch)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning();
  if (!updated) return throwError.notFound('User not found', { id });
  return omit(USER_SENSITIVE_FIELDS, updated);
}

export async function adminDeleteUser(c: HonoCtx, id: string) {
  const [updated] = await c.var.db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning({ id: users.id });
  if (!updated) return throwError.notFound('User not found', { id });
  return { success: true };
}

export async function adminListCategories(c: HonoCtx) {
  return c.var.db.select().from(categories).orderBy(desc(categories.createdAt)).all();
}

export async function adminCreateCategory(c: HonoCtx, body: Record<string, unknown>) {
  const code = requiredString(body['code'], 'code');
  const name = requiredString(body['name'], 'name');
  const slug = requiredString(body['slug'], 'slug');
  const parentId = optionalString(body['parentId']) ?? null;

  let imageUrl: string | null = null;
  const imageFile = collectFormFile(body, 'image');
  if (imageFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'categories', imageFile);
    imageUrl = publicUrl;
  }

  if (parentId) {
    const parent = await c.var.db.select().from(categories).where(eq(categories.id, parentId)).get();
    if (!parent) return throwError.validation('Parent category not found');
  }

  try {
    const [created] = await c.var.db.insert(categories).values({ code, name, slug, parentId, imageUrl }).returning();
    return created;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return throwError.conflict('Category code or slug already exists');
    }
    throw err;
  }
}

export async function adminUpdateCategory(c: HonoCtx, id: string, body: Record<string, unknown>) {
  const existing = await c.var.db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing) return throwError.notFound('Category not found', { id });

  let imageUrl = existing.imageUrl;
  const imageFile = collectFormFile(body, 'image');
  if (imageFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'categories', imageFile);
    imageUrl = publicUrl;
  }

  const code = optionalString(body['code']) ?? existing.code;
  const name = optionalString(body['name']) ?? existing.name;
  const slug = optionalString(body['slug']) ?? existing.slug;
  let parentId = existing.parentId;
  if ('parentId' in body) {
    parentId = optionalString(body['parentId']) ?? null;
    if (parentId === id) return throwError.validation('Category cannot be parent of itself');
    if (parentId) {
      const parent = await c.var.db.select().from(categories).where(eq(categories.id, parentId)).get();
      if (!parent) return throwError.validation('Parent category not found');
    }
  }

  const [updated] = await c.var.db
    .update(categories)
    .set({ code, name, slug, parentId, imageUrl, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  return updated;
}

export async function adminDeleteCategory(c: HonoCtx, id: string) {
  const productCount = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(and(eq(products.categoryId, id), isNull(products.deletedAt)))
    .get();
  if (Number(productCount?.count) > 0) return throwError.conflict('Category has active products');
  const childCount = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.parentId, id))
    .get();
  if (Number(childCount?.count) > 0) return throwError.conflict('Category has child categories');

  await c.var.db.delete(categories).where(eq(categories.id, id));
  return { success: true };
}
