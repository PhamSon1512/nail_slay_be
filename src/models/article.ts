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
    visibility: text('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('public'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    focusKeyword: text('focus_keyword'),
    ogImageUrl: text('og_image_url'),
    canonicalUrl: text('canonical_url'),
    schemaType: text('schema_type').default('Article'),
    noIndex: integer('no_index').default(0),
    readingTime: integer('reading_time'),
    seoScore: integer('seo_score'),
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
