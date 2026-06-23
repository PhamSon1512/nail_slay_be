import { createId } from '@paralleldrive/cuid2';
import { AnySQLiteColumn, index, integer, primaryKey, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { articles } from './article';

export const articleCategories = table(
  'article_categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => articleCategories.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
  },
  (t) => [uniqueIndex('article_categories_slug_udx').on(t.slug), index('article_categories_parent_id_idx').on(t.parentId)],
);

export const articleCategoryMap = table(
  'article_category_map',
  {
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => articleCategories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.categoryId] }),
    categoryIdx: index('article_category_map_category_id_idx').on(t.categoryId),
  }),
);
