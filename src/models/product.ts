import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { categories } from './category';

export const products = table(
  'products',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    sku: text('sku'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    price: integer('price').notNull(),
    originalPrice: integer('original_price'),
    sizeOptions: text('size_options', { mode: 'json' }).$type<string[]>().notNull().default([]),
    formOptions: text('form_options', { mode: 'json' }).$type<string[]>().notNull().default([]),
    stock: integer('stock').notNull().default(0),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>().notNull().default([]),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [
    uniqueIndex('products_slug_udx').on(t.slug),
    uniqueIndex('products_sku_udx').on(t.sku),
    index('products_category_id_idx').on(t.categoryId),
    index('products_deleted_at_idx').on(t.deletedAt),
  ],
);
