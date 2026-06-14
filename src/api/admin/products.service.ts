import type { HonoCtx } from '../../@types';
import type { OrderStatus } from '../../utils/orderStatus';
import { and, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { addresses, categories, complaints, orderItems, orders, products, productVariants, users } from '../../models';
import { throwError } from '../../utils';
import { collectImageFiles, optionalString, parseIntField, parseJsonField, requiredString } from '../../utils/formParse';
import { canAdminTransition } from '../../utils/orderStatus';
import { uploadUserFileToR2 } from '../../utils/r2Upload';

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

  if (imageFiles.length > 0 && !c.env.STORAGE) {
    return throwError.badRequest('Hệ thống chưa cấu hình lưu trữ ảnh (R2). Vui lòng liên hệ quản trị viên.');
  }

  for (const file of imageFiles) {
    try {
      const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'products', file);
      uploadedUrls.push(publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload ảnh thất bại';
      return throwError.badRequest(msg);
    }
  }

  const keepUrls = parseJsonField<string[]>(body['existingImages'], existingUrls);
  return [...keepUrls, ...uploadedUrls];
}

function mapProductDbError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('UNIQUE')) {
    return throwError.conflict('Mã SKU hoặc đường dẫn (slug) đã tồn tại');
  }
  if (msg.includes('FOREIGN KEY')) {
    return throwError.badRequest('Danh mục không hợp lệ hoặc đã bị xóa');
  }
  if (msg.includes('no such column') || msg.includes('no such table')) {
    return throwError.internal('Cơ sở dữ liệu chưa được cập nhật đầy đủ. Vui lòng chạy migration trên server.');
  }
  throw err;
}

async function assertCategoryExists(c: HonoCtx, categoryId: string) {
  const category = await c.var.db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).get();
  if (!category) return throwError.badRequest('Danh mục không tồn tại');
}

export async function adminCreateProduct(c: HonoCtx, body: Record<string, unknown>) {
  const categoryId = requiredString(body['categoryId'], 'categoryId');
  const sku = requiredString(body['sku'], 'sku');
  const name = requiredString(body['name'], 'name');
  const slug = requiredString(body['slug'], 'slug');
  const description = optionalString(body['description']) ?? '';
  const status = optionalString(body['status']) || 'active';
  const price = parseIntField(body['price']);
  const originalPrice = parseIntField(body['originalPrice']);
  const stock = parseIntField(body['stock']);
  const variantsStr = optionalString(body['variants']);
  const variants = variantsStr ? parseJsonField<any[]>(variantsStr, []) : [];

  await assertCategoryExists(c, categoryId);

  if (price === undefined || price <= 0) return throwError.validation('Giá sản phẩm phải lớn hơn 0');
  if (originalPrice !== undefined && originalPrice < price) {
    return throwError.validation('Giá gốc phải lớn hơn hoặc bằng giá bán');
  }
  if (stock === undefined || stock < 0) return throwError.validation('Số lượng tồn kho không được âm');

  const imageUrls = await uploadProductImages(c, body);

  try {
    const [product] = await c.var.db
      .insert(products)
      .values({
        categoryId,
        sku,
        name,
        slug,
        description,
        status,
        price,
        originalPrice: originalPrice ?? price,
        stock,
        imageUrls,
      })
      .returning();

    if (variants.length > 0) {
      await c.var.db.insert(productVariants).values(
        variants.map((v: any, index: number) => ({
          productId: product.id,
          sku: v.sku || null,
          name: v.name || name,
          color: v.color || null,
          size: v.size || null,
          price: Number(v.price) || price,
          stock: Number(v.stock) || 0,
          imageUrl: v.imageUrl || null,
          sortOrder: index,
        })),
      );
    }

    return product;
  } catch (err: unknown) {
    mapProductDbError(err);
  }
}

export async function adminUpdateProduct(c: HonoCtx, id: string, body: Record<string, unknown>) {
  const existing = await c.var.db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .get();
  if (!existing) return throwError.notFound('Không tìm thấy sản phẩm', { id });

  const price = 'price' in body ? parseIntField(body['price']) : existing.price;
  const originalPrice = 'originalPrice' in body ? parseIntField(body['originalPrice']) : (existing.originalPrice ?? undefined);
  const stock = 'stock' in body ? parseIntField(body['stock']) : existing.stock;
  const status = 'status' in body ? optionalString(body['status']) : existing.status;
  const variantsStr = optionalString(body['variants']);
  const variants = variantsStr ? parseJsonField<any[]>(variantsStr, []) : undefined;

  if (price !== undefined && price <= 0) return throwError.validation('Giá sản phẩm phải lớn hơn 0');
  if (originalPrice !== undefined && price !== undefined && originalPrice < price) {
    return throwError.validation('Giá gốc phải lớn hơn hoặc bằng giá bán');
  }
  if (stock !== undefined && stock < 0) return throwError.validation('Số lượng tồn kho không được âm');

  const hasImageChanges = 'images' in body || 'existingImages' in body;
  const imageUrls = hasImageChanges ? await uploadProductImages(c, body, existing.imageUrls ?? []) : existing.imageUrls;

  if ('categoryId' in body && body['categoryId']) {
    await assertCategoryExists(c, requiredString(body['categoryId'], 'categoryId'));
  }

  try {
    const [updatedProduct] = await c.var.db
      .update(products)
      .set({
        categoryId: optionalString(body['categoryId']) ?? existing.categoryId,
        sku: optionalString(body['sku']) ?? existing.sku,
        name: optionalString(body['name']) ?? existing.name,
        slug: optionalString(body['slug']) ?? existing.slug,
        description: 'description' in body ? (optionalString(body['description']) ?? '') : existing.description,
        status: status ?? existing.status,
        price: price ?? existing.price,
        originalPrice: originalPrice ?? existing.originalPrice ?? existing.price,
        stock: stock ?? existing.stock,
        imageUrls,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning();

    if (!updatedProduct) return throwError.notFound('Không tìm thấy sản phẩm', { id });

    if (variants !== undefined) {
      await c.var.db.delete(productVariants).where(eq(productVariants.productId, id));
      if (variants.length > 0) {
        await c.var.db.insert(productVariants).values(
          variants.map((v: any, index: number) => ({
            productId: id,
            sku: v.sku || null,
            name: v.name || updatedProduct.name,
            color: v.color || null,
            size: v.size || null,
            price: Number(v.price) || updatedProduct.price,
            stock: Number(v.stock) || 0,
            imageUrl: v.imageUrl || null,
            sortOrder: index,
          })),
        );
      }
    }

    return updatedProduct;
  } catch (err: unknown) {
    mapProductDbError(err);
  }
}

export async function adminDeleteProduct(c: HonoCtx, id: string) {
  const [updated] = await c.var.db
    .update(products)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning({ id: products.id });
  if (!updated) return throwError.notFound('Không tìm thấy sản phẩm', { id });
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

  const complaint = await c.var.db.select().from(complaints).where(eq(complaints.orderId, id)).get();

  return {
    ...order,
    user: user ?? null,
    address: address ?? null,
    items,
    complaint: complaint ?? null,
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
