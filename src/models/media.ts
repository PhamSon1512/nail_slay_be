import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable as table, text } from 'drizzle-orm/sqlite-core';
import { users } from './user';

export const media = table(
  'media',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    // File information
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(), // MIME type
    fileSize: integer('file_size').notNull(), // WARN-8: size in bytes, must be > 0 (enforced by check constraint)
    // SECURITY: bucketKey is used to construct the R2 storage path.
    // Must be validated at app layer before insert: no '../', no leading '/', no null bytes.
    // App layer (Zod schema) is responsible — DB cannot enforce path safety via CHECK.
    bucketKey: text('bucket_key').notNull().unique(), // R2 storage key — must be globally unique

    // Metadata
    title: text('title'),
    description: text('description'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(), // JSON array of tags

    // Audit information
    // Convention: updatedBy = last editor (NOT set during soft-delete). deletedBy = who soft-deleted.
    // FIX-4: ON DELETE SET NULL — hard-deleting a user must not block on referencing media rows.
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }), // last editor only
    deletedBy: text('deleted_by').references(() => users.id, { onDelete: 'set null' }), // who performed soft-delete
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [
    index('media_created_by_idx').on(t.createdBy),
    index('media_updated_by_idx').on(t.updatedBy),
    index('media_deleted_by_idx').on(t.deletedBy),
    index('media_deleted_at_idx').on(t.deletedAt),
    // FIX-8: enforce fileSize > 0 at DB level — reject malformed upload metadata
    check('media_file_size_positive', sql`${t.fileSize} > 0`),
    // FIX-11: enforce MIME type format (must contain '/') — e.g. "image/png", "application/pdf"
    check('media_file_type_mime', sql`instr(${t.fileType}, '/') > 0`),
  ],
);
