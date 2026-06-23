import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const notFoundLogs = table(
  'not_found_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    path: text('path').notNull(),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    hitCount: integer('hit_count').notNull().default(1),
    firstSeen: integer('first_seen', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    lastSeen: integer('last_seen', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
  },
  (t) => [uniqueIndex('not_found_logs_path_udx').on(t.path)],
);

export const urlRedirects = table(
  'url_redirects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    fromPath: text('from_path').notNull(),
    toPath: text('to_path').notNull(),
    statusCode: integer('status_code').notNull().default(301),
    enabled: integer('enabled').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
  },
  (t) => [uniqueIndex('url_redirects_from_path_udx').on(t.fromPath), index('url_redirects_enabled_idx').on(t.enabled)],
);
