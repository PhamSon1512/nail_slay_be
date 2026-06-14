import type { HonoCtx } from '../@types';
import { and, eq, isNull } from 'drizzle-orm';
import { products, productVariants } from '../models';
import { throwError } from './errors';

export type ResolvedCatalogLine = {
  productId: string;
  variantId: string | null;
  name: string;
  price: number;
  stock: number;
  status: string;
};

export async function resolveCatalogLine(c: HonoCtx, productId: string, variantId?: string | null): Promise<ResolvedCatalogLine> {
  const product = await c.var.db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .get();

  if (!product) return throwError.notFound('Product not found', { productId });
  if (product.status !== 'active') {
    return throwError.badRequest('Sản phẩm không còn bán', { productId, status: product.status });
  }

  if (variantId) {
    const variant = await c.var.db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      .get();
    if (!variant) return throwError.notFound('Variant not found', { variantId, productId });
    return {
      productId,
      variantId,
      name: variant.name || product.name,
      price: variant.price ?? product.price,
      stock: variant.stock ?? 0,
      status: product.status,
    };
  }

  return {
    productId,
    variantId: null,
    name: product.name,
    price: product.price,
    stock: product.stock,
    status: product.status,
  };
}

export async function deductCatalogStock(c: HonoCtx, line: ResolvedCatalogLine, quantity: number, now: Date) {
  if (line.variantId) {
    await c.var.db
      .update(productVariants)
      .set({ stock: line.stock - quantity, updatedAt: now })
      .where(and(eq(productVariants.id, line.variantId), eq(productVariants.productId, line.productId)));
    return;
  }

  await c.var.db
    .update(products)
    .set({ stock: line.stock - quantity, updatedAt: now })
    .where(eq(products.id, line.productId));
}
