import type { Bindings } from '../@types';
import type * as schema from '../models';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { createId } from '@paralleldrive/cuid2';
import { media } from '../models';
import { throwError } from './errors';

export function leafFileName(name: string): string {
  const n = name.replace(/^.*[/\\]/, '').replace(/\0/g, '');
  return n.trim() || 'file';
}

export function splitBaseAndExt(leaf: string): { base: string; ext: string } {
  const i = leaf.lastIndexOf('.');
  if (i <= 0 || i === leaf.length - 1) return { base: leaf, ext: '' };
  return { base: leaf.slice(0, i), ext: leaf.slice(i + 1) };
}

export function safeFolder(folder: string): string {
  const f = folder
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .join('/')
    .trim()
    .slice(0, 120);
  return f || 'uploads';
}

export function safeExt(ext: string): string {
  return ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}

export function safeBase(base: string): string {
  let b = base.replace(/[/\\]/g, '').replace(/\0/g, '').trim();
  if (!b) b = 'file';
  return b.slice(0, 200);
}

export function publicMediaUrl(env: Bindings, fileKey: string): string {
  const raw = env.R2_PUBLIC_BASE_URL?.trim();
  if (!raw) return fileKey;
  const base = raw.replace(/\/$/, '');
  return `${base}/${fileKey}`;
}

/** Upload image to R2 + audit in `media`, return public URL. */
export async function uploadUserFileToR2(
  db: DrizzleD1Database<typeof schema>,
  env: Bindings,
  createdBy: string,
  folder: string,
  file: File,
): Promise<{ row: typeof media.$inferSelect; publicUrl: string }> {
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return throwError.badRequest('File too large. Maximum size allowed is 5MB.');
  }

  const id = createId();
  const leaf = leafFileName(file.name);
  const { base: rawBase, ext: rawExt } = splitBaseAndExt(leaf);
  const base = safeBase(rawBase);
  const ext = safeExt(rawExt).toLowerCase();

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowedExtensions.includes(ext)) {
    return throwError.badRequest('Unsupported file format. Only JPEG, PNG, WEBP, and GIF images are allowed.');
  }

  const folderSafe = safeFolder(folder);
  const fileKey = ext ? `${folderSafe}/${base}-${id}.${ext}` : `${folderSafe}/${base}-${id}`;

  const fileType = file.type || 'application/octet-stream';
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimeTypes.includes(fileType.toLowerCase())) {
    return throwError.badRequest('Unsupported file type. Only JPEG, PNG, WEBP, and GIF images are allowed.');
  }

  await env.STORAGE.put(fileKey, file.stream(), {
    httpMetadata: { contentType: fileType },
  });

  const row = await db
    .insert(media)
    .values({
      id,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      bucketKey: fileKey,
      createdBy,
    })
    .returning()
    .get();

  const publicUrl = publicMediaUrl(env, fileKey);
  return { row: row!, publicUrl };
}

const CONTENT_ASSET_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'aac',
  'pdf',
  'zip',
  'doc',
  'docx',
  'mp4',
  'webm',
];

const CONTENT_ASSET_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'application/pdf',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/webm',
];

/** Upload editor assets (image, audio, documents) to R2. */
export async function uploadContentAssetToR2(
  db: DrizzleD1Database<typeof schema>,
  env: Bindings,
  createdBy: string,
  folder: string,
  file: File,
): Promise<{ row: typeof media.$inferSelect; publicUrl: string; mimeType: string; fileName: string }> {
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    return throwError.badRequest('File too large. Maximum size allowed is 15MB.');
  }

  const id = createId();
  const leaf = leafFileName(file.name);
  const { base: rawBase, ext: rawExt } = splitBaseAndExt(leaf);
  const base = safeBase(rawBase);
  const ext = safeExt(rawExt).toLowerCase();

  if (!CONTENT_ASSET_EXTENSIONS.includes(ext)) {
    return throwError.badRequest('Unsupported file format for editor upload.');
  }

  const folderSafe = safeFolder(folder);
  const fileKey = ext ? `${folderSafe}/${base}-${id}.${ext}` : `${folderSafe}/${base}-${id}`;

  const fileType = (file.type || 'application/octet-stream').toLowerCase();
  if (!CONTENT_ASSET_MIMES.includes(fileType) && !fileType.startsWith('audio/') && !fileType.startsWith('video/')) {
    return throwError.badRequest('Unsupported file type for editor upload.');
  }

  await env.STORAGE.put(fileKey, file.stream(), {
    httpMetadata: { contentType: fileType },
  });

  const row = await db
    .insert(media)
    .values({
      id,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      bucketKey: fileKey,
      createdBy,
    })
    .returning()
    .get();

  const publicUrl = publicMediaUrl(env, fileKey);
  return { row: row!, publicUrl, mimeType: fileType, fileName: file.name };
}
