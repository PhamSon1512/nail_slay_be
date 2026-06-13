import type { HonoCtx } from '../../@types';
import type { OrderStatus } from '../../utils/orderStatus';
import { and, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { addresses, orderItems, orders, products, users } from '../../models';
import { throwError } from '../../utils';
import { collectImageFiles, optionalString, parseIntField, parseJsonField, requiredString } from '../../utils/formParse';
import { canAdminTransition } from '../../utils/orderStatus';
import { uploadUserFileToR2 } from '../../utils/r2Upload';

function parseStringArrayField(value: unknown, fallback: string[] = []) {
  const parsed = parseJsonField<unknown>(value, fallback);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0);
}

export async function adminListProducts(c: HonoCtx, query: { page?: string; limit?: string; search?: string }) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const conditions = [isNull(products.deletedAt)];
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(or(like(products.name, term), like(products.slug, term), like(products.sku, term))!);
  }

  const whereClause = and(...conditions);
  const [{ count }] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .all();

  const items = await c.var.db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return {
    items,
    pagination: { total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) },
  };
}

async function uploadProductImages(c: HonoCtx, body: Record<string, unknown>, existingUrls: string[] = []) {
  const imageFiles = collectImageFiles(body, 'images');
  const uploadedUrls: string[] = [];
  for (const file of imageFiles) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'products', file);
    uploadedUrls.push(publicUrl);
  }
  const keepUrls = parseJsonField<string[]>(body['existingImages'], existingUrls);
  return [...keepUrls, ...uploadedUrls];
}

export async function adminCreateProduct(c: HonoCtx, body: Record<string, unknown>) {
  const categoryId = requiredString(body['categoryId'], 'categoryId');
  const sku = requiredString(body['sku'], 'sku');
  const name = requiredString(body['name'], 'name');
  const slug = requiredString(body['slug'], 'slug');
  const description = optionalString(body['description']);
  const price = parseIntField(body['price']);
  const originalPrice = parseIntField(body['originalPrice']);
  const stock = parseIntField(body['stock']);
  const sizeOptions = parseStringArrayField(body['sizeOptions'], []);
  const formOptions = parseStringArrayField(body['formOptions'], []);

  if (price === undefined || price <= 0) return throwError.validation('Price must be greater than 0');
  if (originalPrice !== undefined && originalPrice < price) {
    return throwError.validation('Original price must be greater than or equal to price');
  }
  if (stock === undefined || stock < 0) return throwError.validation('Stock cannot be negative');

  const imageUrls = await uploadProductImages(c, body);

  try {
    const [created] = await c.var.db
      .insert(products)
      .values({
        categoryId,
        sku,
        name,
        slug,
        description,
        price,
        originalPrice: originalPrice ?? price,
        sizeOptions,
        formOptions,
        stock,
        imageUrls,
      })
      .returning();
    return created;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return throwError.conflict('Product SKU or slug already exists');
    }
    throw err;
  }
}

export async function adminUpdateProduct(c: HonoCtx, id: string, body: Record<string, unknown>) {
  const existing = await c.var.db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .get();
  if (!existing) return throwError.notFound('Product not found', { id });

  const price = 'price' in body ? parseIntField(body['price']) : existing.price;
  const originalPrice = 'originalPrice' in body ? parseIntField(body['originalPrice']) : (existing.originalPrice ?? undefined);
  const stock = 'stock' in body ? parseIntField(body['stock']) : existing.stock;
  const sizeOptions =
    'sizeOptions' in body ? parseStringArrayField(body['sizeOptions'], existing.sizeOptions ?? []) : existing.sizeOptions;
  const formOptions =
    'formOptions' in body ? parseStringArrayField(body['formOptions'], existing.formOptions ?? []) : existing.formOptions;
  if (price !== undefined && price <= 0) return throwError.validation('Price must be greater than 0');
  if (originalPrice !== undefined && price !== undefined && originalPrice < price) {
    return throwError.validation('Original price must be greater than or equal to price');
  }
  if (stock !== undefined && stock < 0) return throwError.validation('Stock cannot be negative');

  const hasImageChanges = 'images' in body || 'existingImages' in body;
  const imageUrls = hasImageChanges ? await uploadProductImages(c, body, existing.imageUrls ?? []) : existing.imageUrls;

  try {
    const [updated] = await c.var.db
      .update(products)
      .set({
        categoryId: optionalString(body['categoryId']) ?? existing.categoryId,
        sku: optionalString(body['sku']) ?? existing.sku,
        name: optionalString(body['name']) ?? existing.name,
        slug: optionalString(body['slug']) ?? existing.slug,
        description: 'description' in body ? (optionalString(body['description']) ?? null) : existing.description,
        price: price ?? existing.price,
        originalPrice: originalPrice ?? existing.originalPrice ?? existing.price,
        sizeOptions,
        formOptions,
        stock: stock ?? existing.stock,
        imageUrls,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning();
    return updated;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return throwError.conflict('Product SKU or slug already exists');
    }
    throw err;
  }
}

export async function adminDeleteProduct(c: HonoCtx, id: string) {
  const [updated] = await c.var.db
    .update(products)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning({ id: products.id });
  if (!updated) return throwError.notFound('Product not found', { id });
  return { success: true };
}

export async function adminListOrders(c: HonoCtx, query: { page?: string; limit?: string; status?: string }) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.status) conditions.push(eq(orders.status, query.status));
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [{ count }] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(whereClause)
    .all();

  const items = await c.var.db
    .select({
      id: orders.id,
      userId: orders.userId,
      addressId: orders.addressId,
      totalAmount: orders.totalAmount,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      userEmail: users.email,
      userFullName: users.fullName,
      userPhone: users.phone,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return {
    items,
    pagination: { total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) },
  };
}

export async function adminGetOrder(c: HonoCtx, id: string) {
  const order = await c.var.db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return throwError.notFound('Order not found', { id });

  const user = await c.var.db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, order.userId))
    .get();

  const address = await c.var.db.select().from(addresses).where(eq(addresses.id, order.addressId)).get();

  const items = await c.var.db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      price: orderItems.price,
      productId: orderItems.productId,
      productName: products.name,
      productSku: products.sku,
      productImageUrls: products.imageUrls,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id))
    .all();

  return {
    ...order,
    user: user ?? null,
    address: address ?? null,
    items,
  };
}

export async function adminUpdateOrderStatus(c: HonoCtx, id: string, status: OrderStatus) {
  const order = await c.var.db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return throwError.notFound('Order not found', { id });

  if (!canAdminTransition(order.status as OrderStatus, status)) {
    return throwError.badRequest(`Cannot transition from ${order.status} to ${status}`);
  }

  if (status === 'CANCELLED') {
    return c.var.db.transaction(async (tx) => {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id)).all();
      for (const item of items) {
        const product = await tx.select().from(products).where(eq(products.id, item.productId)).get();
        if (product) {
          await tx
            .update(products)
            .set({ stock: product.stock + item.quantity, updatedAt: new Date() })
            .where(eq(products.id, item.productId));
        }
      }
      const [updated] = await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
      return updated;
    });
  }

  const [updated] = await c.var.db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
  return updated;
}
