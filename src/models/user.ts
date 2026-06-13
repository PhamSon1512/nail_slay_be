import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable as table, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = table(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text('email').notNull(),
    password: text('password').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    fullName: text('full_name'),
    phone: text('phone'),
    // Role is a plain text string — validated against casbinPolicies.ts at auth time.
    // No FK to a roles table; role names are defined in src/utils/casbinPolicies.ts.
    role: text('role').default('user'),
    // Stores SHA-256(refreshJWT), NOT the plain JWT. Direct DB inserts MUST also hash.
    refreshToken: text('refresh_token'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [
    index('user_deleted_at_idx').on(t.deletedAt),
    uniqueIndex('users_email_active_udx')
      .on(t.email)
      .where(sql`${t.deletedAt} IS NULL`),
    index('users_refresh_token_idx').on(t.refreshToken),
  ],
);
