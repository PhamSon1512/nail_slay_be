import { createId } from '@paralleldrive/cuid2';
import { AnySQLiteColumn, index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const categories = table(
  'categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    code: text('code'),
    parentId: text('parent_id').references((): AnySQLiteColumn => categories.id, { onDelete: 'set null' }),
    imageUrl: text('image_url'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [
    uniqueIndex('categories_slug_udx').on(t.slug),
    uniqueIndex('categories_code_udx').on(t.code),
    index('categories_parent_id_idx').on(t.parentId),
  ],
);
