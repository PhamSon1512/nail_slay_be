import { createId } from '@paralleldrive/cuid2';
import { integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const settings = table(
  'settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    key: text('key').notNull(),
    value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [uniqueIndex('settings_key_udx').on(t.key)],
);

export const SETTING_KEYS = {
  BANNER: 'banner',
  HOMEPAGE: 'homepage',
  CONTACT_INFO: 'contact_info',
  QR_CODE_URL: 'qr_code_url',
  BANK_INFO: 'bank_info',
} as const;
