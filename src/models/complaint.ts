import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { orders } from './order';
import { users } from './user';

export const complaints = table(
  'complaints',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>().notNull().default([]),
    adminResponse: text('admin_response'),
    status: text('status').notNull().default('OPEN'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [
    uniqueIndex('complaints_order_id_udx').on(t.orderId),
    index('complaints_user_id_idx').on(t.userId),
    index('complaints_status_idx').on(t.status),
  ],
);
