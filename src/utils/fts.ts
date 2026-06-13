import type { SQL } from 'drizzle-orm';
import { and, or, sql } from 'drizzle-orm';
import { type SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * Convert Vietnamese accented characters to non-accented equivalents in SQL.
 * This is evaluated on the database side to achieve Accent Insensitive searches in SQLite.
 *
 * @param col - The Drizzle column or SQL expression to strip accents from.
 */
export function stripAccentsSql(col: SQLiteColumn | SQL): SQL {
  let expr = sql`lower(${col})`;

  // Group A
  expr = sql`replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(${expr}, 'á', 'a'), 'à', 'a'), 'ả', 'a'), 'ã', 'a'), 'ạ', 'a'), 'â', 'a'), 'ấ', 'a'), 'ầ', 'a'), 'ẩ', 'a'), 'ẫ', 'a'), 'ậ', 'a'), 'ă', 'a'), 'ắ', 'a'), 'ằ', 'a'), 'ẳ', 'a'), 'ẵ', 'a'), 'ặ', 'a')`;
  // Group E
  expr = sql`replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(${expr}, 'é', 'e'), 'è', 'e'), 'ẻ', 'e'), 'ẽ', 'e'), 'ẹ', 'e'), 'ê', 'e'), 'ế', 'e'), 'ề', 'e'), 'ể', 'e'), 'ễ', 'e'), 'ệ', 'e')`;
  // Group I
  expr = sql`replace(replace(replace(replace(replace(${expr}, 'í', 'i'), 'ì', 'i'), 'ỉ', 'i'), 'ĩ', 'i'), 'ị', 'i')`;
  // Group O
  expr = sql`replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(${expr}, 'ó', 'o'), 'ò', 'o'), 'ỏ', 'o'), 'õ', 'o'), 'ọ', 'o'), 'ô', 'o'), 'ố', 'o'), 'ồ', 'o'), 'ổ', 'o'), 'ỗ', 'o'), 'ộ', 'o'), 'ơ', 'o'), 'ớ', 'o'), 'ờ', 'o'), 'ở', 'o'), 'ỡ', 'o'), 'ợ', 'o')`;
  // Group U
  expr = sql`replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(${expr}, 'ú', 'u'), 'ù', 'u'), 'ủ', 'u'), 'ũ', 'u'), 'ụ', 'u'), 'ư', 'u'), 'ứ', 'u'), 'ừ', 'u'), 'ử', 'u'), 'ữ', 'u'), 'ự', 'u')`;
  // Group Y
  expr = sql`replace(replace(replace(replace(replace(${expr}, 'ý', 'y'), 'ỳ', 'y'), 'ỷ', 'y'), 'ỹ', 'y'), 'ỵ', 'y')`;
  // Group D
  expr = sql`replace(${expr}, 'đ', 'd')`;

  return expr;
}

/**
 * Remove accents from a JavaScript string.
 */
export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

export interface FtsOptions {
  /**
   * Whether to perform accent-insensitive search.
   * If true (default), strips accents from both DB columns and search tokens.
   * Turn off to improve SQL execution performance on large tables.
   */
  accentInsensitive?: boolean;
}

/**
 * Build a dynamic Drizzle SQL condition that acts as a Full-Text Search (FTS) engine in SQLite.
 *
 * It splits the search query into tokens, matches all tokens (AND),
 * and checks if any specified column matches each token (OR).
 *
 * @param columns - List of Drizzle SQLite columns to search.
 * @param query - The search string.
 * @param options - FTS configuration options.
 */
export function buildFtsCondition(columns: SQLiteColumn[], query: string | undefined, options: FtsOptions = {}): SQL | undefined {
  if (!query) return undefined;

  const trimmed = query.trim();
  if (!trimmed) return undefined;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;

  const { accentInsensitive = true } = options;
  const andConditions: SQL[] = [];

  for (const token of tokens) {
    const orConditions: SQL[] = [];
    const normalizedToken = accentInsensitive ? removeAccents(token) : token.toLowerCase();

    for (const col of columns) {
      if (accentInsensitive) {
        orConditions.push(sql`${stripAccentsSql(col)} LIKE ${'%' + normalizedToken + '%'}`);
      } else {
        orConditions.push(sql`lower(${col}) LIKE ${'%' + normalizedToken + '%'}`);
      }
    }

    if (orConditions.length > 0) {
      const condition = or(...orConditions);
      if (condition) andConditions.push(condition);
    }
  }

  return andConditions.length > 0 ? and(...andConditions) : undefined;
}
