import type { HonoCtx } from '../../@types';
import type { AddCartItemSchema, UpdateCartItemSchema } from './openapi';
import type { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { cartItems, products } from '../../models';
import { throwError } from '../../utils';
import { resolveCatalogLine } from '../../utils/productCatalog';

export async function getCart(c: HonoCtx) {
  const userId = c.var.jwtPayload.id!;

  const items = await c.var.db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      variantId: cartItems.variantId,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        stock: products.stock,
        imageUrls: products.imageUrls,
        status: products.status,
      },
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.userId, userId), isNull(products.deletedAt), eq(products.status, 'active')))
    .all();

  const enriched = await Promise.all(
    items.map(async (item) => {
      const line = await resolveCatalogLine(c, item.product.id, item.variantId ?? null);
      return {
        id: item.id,
        quantity: item.quantity,
        variant_id: item.variantId,
        product: {
          ...item.product,
          price: line.price,
          stock: line.stock,
          name: line.name,
        },
      };
    }),
  );

  const subtotal = enriched.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return { items: enriched, subtotal };
}

export async function addCartItem(c: HonoCtx, input: z.infer<typeof AddCartItemSchema>) {
  const userId = c.var.jwtPayload.id!;
  const variantId = input.variant_id ?? null;

  const line = await resolveCatalogLine(c, input.product_id, variantId);
  if (line.stock < input.quantity) {
    return throwError.conflict('Insufficient stock', { stock: line.stock });
  }

  const existing = await c.var.db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, input.product_id),
        variantId ? eq(cartItems.variantId, variantId) : sql`IFNULL(${cartItems.variantId}, '') = ''`,
      ),
    )
    .get();

  if (existing) {
    const newQty = existing.quantity + input.quantity;
    if (line.stock < newQty) return throwError.conflict('Insufficient stock', { stock: line.stock });
    const [updated] = await c.var.db
      .update(cartItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await c.var.db
    .insert(cartItems)
    .values({ userId, productId: input.product_id, variantId, quantity: input.quantity })
    .returning();
  return created;
}

export async function updateCartItem(c: HonoCtx, id: string, input: z.infer<typeof UpdateCartItemSchema>) {
  const userId = c.var.jwtPayload.id!;

  const item = await c.var.db
    .select({ cartItem: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)))
    .get();

  if (!item) return throwError.notFound('Cart item not found', { id });

  const line = await resolveCatalogLine(c, item.cartItem.productId, item.cartItem.variantId ?? null);
  if (line.stock < input.quantity) return throwError.conflict('Insufficient stock', { stock: line.stock });

  const [updated] = await c.var.db
    .update(cartItems)
    .set({ quantity: input.quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, id))
    .returning();
  return updated;
}

export async function deleteCartItem(c: HonoCtx, id: string) {
  const userId = c.var.jwtPayload.id!;

  const existing = await c.var.db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)))
    .get();
  if (!existing) return throwError.notFound('Cart item not found', { id });

  await c.var.db.delete(cartItems).where(eq(cartItems.id, id));
  return { success: true };
}
