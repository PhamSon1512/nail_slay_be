import type { HonoCtx } from '../../@types';
import type { CheckoutBodySchema } from './openapi';
import type { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import { addresses, cartItems, orderItems, orders, products, productVariants, users } from '../../models';
import { SETTING_KEYS } from '../../models/setting';
import { throwError } from '../../utils';
import { resolveCatalogLine } from '../../utils/productCatalog';
import { getSettingValue } from '../../utils/settings';

const IDEMPOTENCY_TTL_SECONDS = 86_400;

function mapStockAbort(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('INSUFFICIENT_STOCK')) {
    return throwError.conflict('Không đủ tồn kho cho một hoặc nhiều sản phẩm trong giỏ');
  }
  throw err;
}

async function reserveStock(
  c: HonoCtx,
  lines: Array<{ cartItem: { quantity: number }; line: Awaited<ReturnType<typeof resolveCatalogLine>> }>,
  now: Date,
) {
  for (const { cartItem, line } of lines) {
    let result: D1Result<unknown>;
    if (line.variantId) {
      result = await c.env.DB.prepare(
        'UPDATE product_variants SET stock = stock - ?, updated_at = ? WHERE id = ? AND product_id = ? AND stock >= ?',
      )
        .bind(cartItem.quantity, now.getTime(), line.variantId, line.productId, cartItem.quantity)
        .run();
    } else {
      result = await c.env.DB.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL AND status = ? AND stock >= ?',
      )
        .bind(cartItem.quantity, now.getTime(), line.productId, 'active', cartItem.quantity)
        .run();
    }

    if (!result.meta.changes) {
      return throwError.conflict(`Không đủ tồn kho cho ${line.name}`, {
        productId: line.productId,
        variantId: line.variantId,
        stock: line.stock,
      });
    }
  }
}

async function releaseStock(
  c: HonoCtx,
  lines: Array<{ quantity: number; productId: string; variantId: string | null; price: number }>,
  now: Date,
) {
  for (const line of lines) {
    if (line.variantId) {
      await c.env.DB.prepare('UPDATE product_variants SET stock = stock + ?, updated_at = ? WHERE id = ? AND product_id = ?')
        .bind(line.quantity, now.getTime(), line.variantId, line.productId)
        .run();
    } else {
      await c.env.DB.prepare('UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?')
        .bind(line.quantity, now.getTime(), line.productId)
        .run();
    }
  }
}

export async function checkout(c: HonoCtx, input: z.infer<typeof CheckoutBodySchema>) {
  const userId = c.var.jwtPayload.id!;

  const idempotencyKey = c.req.header('Idempotency-Key')?.trim();
  if (idempotencyKey) {
    const cacheKey = `checkout:idemp:${userId}:${idempotencyKey}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) return JSON.parse(cached) as Awaited<ReturnType<typeof buildCheckoutResponse>>;
  }

  const user = await c.var.db
    .select({ accountStatus: users.accountStatus, blockReason: users.blockReason })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();
  if (user?.accountStatus === 'blocked') {
    return throwError.forbidden('Tài khoản đã bị chặn', {
      reason: user.blockReason ?? 'Liên hệ admin để biết thêm chi tiết.',
    });
  }

  const address = await c.var.db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, input.address_id), eq(addresses.userId, userId)))
    .get();
  if (!address) return throwError.notFound('Address not found', { addressId: input.address_id });

  const cartRows = await c.var.db
    .select({ cartItem: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.userId, userId), isNull(products.deletedAt), eq(products.status, 'active')))
    .all();

  if (cartRows.length === 0) return throwError.badRequest('Cart is empty');

  const resolvedLines = [];
  for (const row of cartRows) {
    const line = await resolveCatalogLine(c, row.cartItem.productId, row.cartItem.variantId ?? null);
    if (line.stock < row.cartItem.quantity) {
      return throwError.conflict(`Insufficient stock for ${line.name}`, {
        productId: line.productId,
        variantId: line.variantId,
        stock: line.stock,
      });
    }
    resolvedLines.push({ cartItem: row.cartItem, line });
  }

  const totalAmount = resolvedLines.reduce((sum, row) => sum + row.line.price * row.cartItem.quantity, 0);
  const orderId = createId();
  const now = new Date();

  try {
    await reserveStock(c, resolvedLines, now);
  } catch (err) {
    mapStockAbort(err);
    throw err;
  }

  try {
    await c.var.db.batch([
      c.var.db.insert(orders).values({
        id: orderId,
        userId,
        addressId: input.address_id,
        totalAmount,
        paymentMethod: input.payment_method,
        status: 'PENDING_PAYMENT',
        createdAt: now,
      }),
      ...resolvedLines.map(({ cartItem, line }) =>
        c.var.db.insert(orderItems).values({
          orderId,
          productId: line.productId,
          variantId: line.variantId,
          quantity: cartItem.quantity,
          price: line.price,
        }),
      ),
      c.var.db.delete(cartItems).where(eq(cartItems.userId, userId)),
    ]);
  } catch (err) {
    await releaseStock(
      c,
      resolvedLines.map(({ cartItem, line }) => ({
        quantity: cartItem.quantity,
        productId: line.productId,
        variantId: line.variantId,
        price: line.price,
      })),
      now,
    );
    throw err;
  }

  const order = await c.var.db.select().from(orders).where(eq(orders.id, orderId)).get();
  const response = await buildCheckoutResponse(c, order!, orderId);

  if (idempotencyKey) {
    await c.env.CACHE.put(`checkout:idemp:${userId}:${idempotencyKey}`, JSON.stringify(response), {
      expirationTtl: IDEMPOTENCY_TTL_SECONDS,
    });
  }

  return response;
}

async function buildCheckoutResponse(c: HonoCtx, order: typeof orders.$inferSelect, orderId: string) {
  const bankInfo = await getSettingValue<Record<string, string>>(c.var.db, SETTING_KEYS.BANK_INFO);
  const qrCodeUrl = bankInfo?.qr_code_url ?? (await getSettingValue<string>(c.var.db, SETTING_KEYS.QR_CODE_URL)) ?? '';

  const transferContent =
    typeof bankInfo?.transfer_content === 'string' ? bankInfo.transfer_content.replace('{order_id}', orderId) : orderId;

  return {
    order: {
      id: order.id,
      total_amount: order.totalAmount,
      status: order.status,
      created_at: order.createdAt,
    },
    payment: {
      qr_code_url: qrCodeUrl ?? '',
      bank_info: bankInfo ? { ...bankInfo, transfer_content: transferContent } : null,
    },
  };
}
