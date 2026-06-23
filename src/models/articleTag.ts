import { createId } from '@paralleldrive/cuid2';
import { index, integer, primaryKey, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { articles } from './article';

export const articleTags = table(
  'article_tags',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
  },
  (t) => [uniqueIndex('article_tags_slug_udx').on(t.slug)],
);

export const articleTagMap = table(
  'article_tag_map',
  {
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => articleTags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.tagId] }),
    tagIdx: index('article_tag_map_tag_id_idx').on(t.tagId),
  }),
);
