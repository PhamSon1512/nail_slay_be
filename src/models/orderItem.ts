import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text } from 'drizzle-orm/sqlite-core';
import { orders } from './order';
import { products } from './product';
import { productVariants } from './productVariant';

export const orderItems = table(
  'order_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    price: integer('price').notNull(),
  },
  (t) => [index('order_items_order_id_idx').on(t.orderId), index('order_items_product_id_idx').on(t.productId)],
);
