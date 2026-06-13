import type { HonoCtx } from '../../@types';
import type { OrderStatus } from '../../utils/orderStatus';
import type { UpdateOrderStatusSchema } from './openapi';
import type { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { complaints, orderItems, orders, products } from '../../models';
import { throwError } from '../../utils';
import { canUserTransition } from '../../utils/orderStatus';

export async function listOrders(c: HonoCtx) {
  const userId = c.var.jwtPayload.id!;
  return c.var.db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).all();
}

export async function getOrderById(c: HonoCtx, id: string) {
  const userId = c.var.jwtPayload.id!;

  const order = await c.var.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .get();
  if (!order) return throwError.notFound('Order not found', { id });

  const items = await c.var.db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      price: orderItems.price,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrls: products.imageUrls,
      },
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id))
    .all();

  const complaint = await c.var.db.select().from(complaints).where(eq(complaints.orderId, id)).get();

  return { ...order, items, complaint: complaint ?? null };
}

export async function updateOrderStatus(c: HonoCtx, id: string, input: z.infer<typeof UpdateOrderStatusSchema>) {
  const userId = c.var.jwtPayload.id!;

  const order = await c.var.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .get();
  if (!order) return throwError.notFound('Order not found', { id });

  const newStatus = input.status as OrderStatus;
  if (!canUserTransition(order.status as OrderStatus, newStatus)) {
    return throwError.badRequest(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  if (newStatus === 'COMPLAINED') {
    if (!input.reason) return throwError.validation('Reason is required for complaint');
    return c.var.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(complaints).values({
        orderId: id,
        userId,
        reason: input.reason!,
        imageUrls: input.image_urls ?? [],
        status: 'OPEN',
      });

      return updated;
    });
  }

  const [updated] = await c.var.db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  return updated;
}
