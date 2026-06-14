import type { HonoCtx } from '../../@types';
import type { OrderStatus } from '../../utils/orderStatus';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { complaints, orderItems, orders, products, productVariants, users } from '../../models';
import { SETTING_KEYS, settings } from '../../models/setting';
import { throwError } from '../../utils';
import { invalidateCacheKey } from '../../utils/cache';
import { collectFormFile, optionalString, requiredString } from '../../utils/formParse';
import { canAdminTransition } from '../../utils/orderStatus';
import { uploadUserFileToR2 } from '../../utils/r2Upload';
import { getSettingValue, upsertSetting } from '../../utils/settings';

export type BankInfo = {
  bank_name: string;
  account_number: string;
  account_name: string;
  transfer_content: string;
  qr_code_url: string;
};

export async function adminListComplaints(c: HonoCtx) {
  return c.var.db.select().from(complaints).orderBy(desc(complaints.createdAt)).all();
}

export async function adminResolveComplaint(c: HonoCtx, id: string, input: { admin_response: string; status: 'RESOLVED' }) {
  const complaint = await c.var.db.select().from(complaints).where(eq(complaints.id, id)).get();
  if (!complaint) return throwError.notFound('Complaint not found', { id });

  const order = await c.var.db.select().from(orders).where(eq(orders.id, complaint.orderId)).get();
  if (!order) return throwError.notFound('Order not found', { id: complaint.orderId });

  if (order.status !== 'COMPLAINED') {
    return throwError.badRequest('Chỉ có thể giải quyết khiếu nại khi đơn ở trạng thái COMPLAINED');
  }

  if (!canAdminTransition(order.status as OrderStatus, 'RESOLVED')) {
    return throwError.badRequest(`Cannot transition from ${order.status} to RESOLVED`);
  }

  return c.var.db.transaction(async (tx) => {
    const [updated] = await tx
      .update(complaints)
      .set({ adminResponse: input.admin_response, status: input.status, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();

    await tx.update(orders).set({ status: 'RESOLVED', updatedAt: new Date() }).where(eq(orders.id, complaint.orderId));

    return updated;
  });
}

export async function adminGetSettings(c: HonoCtx) {
  const rows = await c.var.db.select().from(settings).all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const { getHomepageConfig } = await import('../../utils/homepage');
  const homepage = await getHomepageConfig(c.var.db);
  return { ...map, homepage };
}

export async function adminUpdateSettings(
  c: HonoCtx,
  input: {
    banner?: unknown;
    contact_info?: unknown;
  },
) {
  const updates: Record<string, unknown> = {};
  if (input.banner !== undefined) updates[SETTING_KEYS.BANNER] = input.banner;
  if (input.contact_info !== undefined) updates[SETTING_KEYS.CONTACT_INFO] = input.contact_info;

  for (const [key, value] of Object.entries(updates)) {
    await upsertSetting(c.var.db, key, value);
  }

  return adminGetSettings(c);
}

export async function adminUpdateBankInfo(c: HonoCtx, body: Record<string, unknown>) {
  const bankName = requiredString(body['bank_name'], 'bank_name');
  const accountNumber = requiredString(body['account_number'], 'account_number');
  const accountName = requiredString(body['account_name'], 'account_name');

  const existingBank = await getSettingValue<BankInfo>(c.var.db, SETTING_KEYS.BANK_INFO);
  const existingQr = existingBank?.qr_code_url || (await getSettingValue<string>(c.var.db, SETTING_KEYS.QR_CODE_URL)) || '';

  let qrCodeUrl = existingQr;
  const qrFile = collectFormFile(body, 'qr_image');
  if (qrFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'settings/qr', qrFile);
    qrCodeUrl = publicUrl;
  }

  if (!qrCodeUrl) {
    return throwError.badRequest('QR image is required (field `qr_image`)');
  }

  const transferContent = optionalString(body['transfer_content']) ?? existingBank?.transfer_content ?? 'NAILSLAY {order_id}';

  const bankInfo: BankInfo = {
    bank_name: bankName,
    account_number: accountNumber,
    account_name: accountName,
    transfer_content: transferContent,
    qr_code_url: qrCodeUrl,
  };

  await upsertSetting(c.var.db, SETTING_KEYS.BANK_INFO, bankInfo);
  await upsertSetting(c.var.db, SETTING_KEYS.QR_CODE_URL, qrCodeUrl);
  await invalidateCacheKey(c.env.CACHE, 'public:settings:v1');

  return { bank_info: bankInfo };
}

export async function adminStats(c: HonoCtx) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [revenueTotal] = await c.var.db
    .select({ total: sql<number>`coalesce(sum(total_amount), 0)` })
    .from(orders)
    .where(sql`status IN ('PAID', 'SHIPPING', 'DELIVERED', 'RECEIVED', 'RESOLVED')`)
    .all();

  const [revenueMonth] = await c.var.db
    .select({ total: sql<number>`coalesce(sum(total_amount), 0)` })
    .from(orders)
    .where(and(sql`status IN ('PAID', 'SHIPPING', 'DELIVERED', 'RECEIVED', 'RESOLVED')`, gte(orders.createdAt, monthStart)))
    .all();

  const [ordersTotal] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .all();
  const [usersTotal] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .all();
  const [productsTotal] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(sql`deleted_at IS NULL`)
    .all();
  const [openComplaints] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(complaints)
    .where(eq(complaints.status, 'OPEN'))
    .all();

  const statusRows = await c.var.db
    .select({ status: orders.status, count: sql<number>`count(*)` })
    .from(orders)
    .groupBy(orders.status)
    .all();

  const ordersByStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)]));

  return {
    revenue_total: Number(revenueTotal?.total ?? 0),
    revenue_this_month: Number(revenueMonth?.total ?? 0),
    orders_total: Number(ordersTotal?.count ?? 0),
    orders_by_status: ordersByStatus,
    users_total: Number(usersTotal?.count ?? 0),
    products_total: Number(productsTotal?.count ?? 0),
    open_complaints: Number(openComplaints?.count ?? 0),
  };
}
