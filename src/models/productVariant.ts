import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { products } from './product';

export const productVariants = table(
  'product_variants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: text('sku'),
    name: text('name').notNull(),
    color: text('color'),
    size: text('size'),
    price: integer('price').notNull(),
    stock: integer('stock').notNull().default(0),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [
    uniqueIndex('product_variants_sku_udx').on(t.sku),
    index('product_variants_product_id_idx').on(t.productId),
    index('product_variants_sort_order_idx').on(t.sortOrder),
  ],
);
