import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { products } from './product';
import { productVariants } from './productVariant';
import { users } from './user';

export const cartItems = table(
  'cart_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [
    uniqueIndex('cart_items_user_product_variant_udx').on(t.userId, t.productId, sql`IFNULL(${t.variantId}, '')`),
    index('cart_items_user_id_idx').on(t.userId),
  ],
);
