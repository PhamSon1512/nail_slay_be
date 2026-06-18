import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const articles = table(
  'articles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    content: text('content').notNull().default(''),
    coverImageUrl: text('cover_image_url'),
    authorId: text('author_id'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [
    uniqueIndex('articles_slug_active_udx')
      .on(t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('articles_status_idx').on(t.status),
    index('articles_published_at_idx').on(t.publishedAt),
    index('articles_deleted_at_idx').on(t.deletedAt),
  ],
);
