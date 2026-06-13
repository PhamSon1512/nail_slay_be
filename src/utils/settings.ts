import type { DrizzleDb } from '../db';
import { eq } from 'drizzle-orm';
import { SETTING_KEYS, settings } from '../models/setting';
import { getHomepageConfig } from './homepage';

export async function getSettingValue<T>(db: DrizzleDb, key: string): Promise<T | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return (row?.value as T) ?? null;
}

export async function getPublicSettings(db: DrizzleDb) {
  const rows = await db.select().from(settings).all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const bankInfo = (map[SETTING_KEYS.BANK_INFO] as Record<string, string> | undefined) ?? null;
  const qrFromBank = typeof bankInfo?.qr_code_url === 'string' ? bankInfo.qr_code_url : null;
  const qrFromSetting = map[SETTING_KEYS.QR_CODE_URL] ?? null;

  const homepage = await getHomepageConfig(db);

  return {
    banner: map[SETTING_KEYS.BANNER] ?? null,
    homepage,
    contact_info: map[SETTING_KEYS.CONTACT_INFO] ?? null,
    qr_code_url: qrFromBank ?? qrFromSetting ?? null,
    bank_info: bankInfo,
  };
}

export async function upsertSetting(db: DrizzleDb, key: string, value: unknown) {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    return db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key)).returning().get();
  }
  return db.insert(settings).values({ key, value }).returning().get();
}
