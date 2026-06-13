import type { HonoCtx } from '../../@types';
import type { CheckoutBodySchema } from './openapi';
import type { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import { addresses, cartItems, orderItems, orders, products, users } from '../../models';
import { SETTING_KEYS } from '../../models/setting';
import { throwError } from '../../utils';
import { getSettingValue } from '../../utils/settings';

export async function checkout(c: HonoCtx, input: z.infer<typeof CheckoutBodySchema>) {
  const userId = c.var.jwtPayload.id!;

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
    .where(and(eq(cartItems.userId, userId), isNull(products.deletedAt)))
    .all();

  if (cartRows.length === 0) return throwError.badRequest('Cart is empty');

  for (const row of cartRows) {
    if (row.product.stock < row.cartItem.quantity) {
      return throwError.conflict(`Insufficient stock for ${row.product.name}`, {
        productId: row.product.id,
        stock: row.product.stock,
      });
    }
  }

  const totalAmount = cartRows.reduce((sum, row) => sum + row.product.price * row.cartItem.quantity, 0);

  const orderId = createId();
  const now = new Date();

  const batchStatements = [
    c.var.db.insert(orders).values({
      id: orderId,
      userId,
      addressId: input.address_id,
      totalAmount,
      paymentMethod: input.payment_method,
      status: 'PENDING_PAYMENT',
      createdAt: now,
    }),
    ...cartRows.map((row) =>
      c.var.db.insert(orderItems).values({
        orderId,
        productId: row.product.id,
        quantity: row.cartItem.quantity,
        price: row.product.price,
      }),
    ),
    ...cartRows.map((row) =>
      c.var.db
        .update(products)
        .set({ stock: row.product.stock - row.cartItem.quantity, updatedAt: now })
        .where(eq(products.id, row.product.id)),
    ),
    c.var.db.delete(cartItems).where(eq(cartItems.userId, userId)),
  ];

  await c.var.db.batch(batchStatements);

  const order = await c.var.db.select().from(orders).where(eq(orders.id, orderId)).get();

  const bankInfo = await getSettingValue<Record<string, string>>(c.var.db, SETTING_KEYS.BANK_INFO);
  const qrCodeUrl = bankInfo?.qr_code_url ?? (await getSettingValue<string>(c.var.db, SETTING_KEYS.QR_CODE_URL)) ?? '';

  const transferContent =
    typeof bankInfo?.transfer_content === 'string' ? bankInfo.transfer_content.replace('{order_id}', orderId) : orderId;

  return {
    order: {
      id: order!.id,
      total_amount: order!.totalAmount,
      status: order!.status,
      created_at: order!.createdAt,
    },
    payment: {
      qr_code_url: qrCodeUrl ?? '',
      bank_info: bankInfo ? { ...bankInfo, transfer_content: transferContent } : null,
    },
  };
}
