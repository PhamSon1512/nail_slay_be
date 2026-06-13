/**
 * Sensitive fields to omit before returning user objects in API responses.
 * Single source of truth — add new sensitive fields here only.
 */
export const USER_SENSITIVE_FIELDS = ['password', 'refreshToken', 'deletedAt'] as const;
