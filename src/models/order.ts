import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text } from 'drizzle-orm/sqlite-core';
import { addresses } from './address';
import { users } from './user';

export const orders = table(
  'orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    addressId: text('address_id')
      .notNull()
      .references(() => addresses.id, { onDelete: 'restrict' }),
    totalAmount: integer('total_amount').notNull(),
    paymentMethod: text('payment_method').notNull().default('BANK_TRANSFER'),
    status: text('status').notNull().default('PENDING_PAYMENT'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [index('orders_user_id_idx').on(t.userId), index('orders_status_idx').on(t.status)],
);
