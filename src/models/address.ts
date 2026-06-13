import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text } from 'drizzle-orm/sqlite-core';
import { users } from './user';

export const addresses = table(
  'addresses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    detail: text('detail').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [index('addresses_user_id_idx').on(t.userId)],
);
