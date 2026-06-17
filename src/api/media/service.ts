import type { HonoCtx } from '../../@types';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import { media } from '../../models';
import { AuditAction } from '../../models/auditLog';
import { throwError, writeAudit } from '../../utils';

// SEC: max upload size — reject before hitting R2 to avoid wasted egress costs
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function uploadMedia(c: HonoCtx) {
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  if (!file) return throwError.badRequest('No file uploaded');

  // WARN-8: validate fileSize > 0 at application layer before hitting DB check constraint
  if (file.size <= 0) return throwError.badRequest('File is empty (size must be > 0)');

  // SEC-HIGH-7: reject files exceeding max size before uploading to R2
  if (file.size > MAX_FILE_SIZE_BYTES)
    return throwError.badRequest(`File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`, {
      fileSize: file.size,
      maxSize: MAX_FILE_SIZE_BYTES,
    });

  if (file.size > 2 * 1024 * 1024) {
    return throwError.badRequest('Kích thước ảnh không được vượt quá 2MB.');
  }

  const fileKey = createId();
  const fileType = file.type;
  const fileSize = file.size;

  // Upload to R2 first — DB insert may fail afterward, handled below
  await c.env.STORAGE.put(fileKey, file.stream(), {
    httpMetadata: { contentType: fileType },
  });

  // Save to database — if this fails, rollback by deleting the R2 object (API-5)
  let result;
  try {
    result = await c.var.db
      .insert(media)
      .values({
        fileName: file.name,
        fileType,
        fileSize,
        bucketKey: fileKey,
        createdBy: c.var.jwtPayload.id,
      })
      .returning()
      .get();
  } catch (err) {
    // Rollback: remove orphaned R2 object to keep storage consistent
    await c.env.STORAGE.delete(fileKey);
    throw err;
  }

  void writeAudit(c, {
    action: AuditAction.MEDIA_UPLOAD,
    entityType: 'media',
    entityId: result.id,
    newValue: {
      id: result.id,
      fileName: result.fileName,
      fileType: result.fileType,
      fileSize: result.fileSize,
      bucketKey: result.bucketKey,
    } as Record<string, unknown>,
  });

  return result;
}

export async function getMediaForDownload(c: HonoCtx, id: string) {
  // Exclude soft-deleted files
  const fileInfo = await c.var.db
    .select()
    .from(media)
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .get();
  if (!fileInfo) return throwError.notFound('File');

  // Get file from R2
  const file = await c.env.STORAGE.get(fileInfo.bucketKey);
  if (!file) return throwError.notFound('File');

  return {
    body: file.body,
    fileType: fileInfo.fileType,
    // SEC-HIGH-2: sanitize fileName against HTTP header injection
    fileName: fileInfo.fileName.replace(/["\\r\\n]/g, '_'),
  };
}
