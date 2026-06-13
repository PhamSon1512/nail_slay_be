import { throwError } from './errors';

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function requiredString(value: unknown, field: string): string {
  const trimmed = optionalString(value);
  if (!trimmed) return throwError.badRequest(`${field} is required`);
  return trimmed;
}

export function parseBooleanField(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function parseIntField(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : undefined;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function collectImageFiles(body: Record<string, unknown>, field = 'images'): File[] {
  const files: File[] = [];
  const raw = body[field];
  if (raw instanceof File && raw.size > 0) files.push(raw);
  if (Array.isArray(raw)) {
    for (const file of raw) {
      if (file instanceof File && file.size > 0) files.push(file);
    }
  }
  return files;
}

export function collectFormFile(body: Record<string, unknown>, field: string): File | undefined {
  const raw = body[field];
  if (raw instanceof File && raw.size > 0) return raw;
  return undefined;
}
