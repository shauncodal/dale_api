import crypto from 'crypto';

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random temporary password (12–16 chars, alphanumeric).
 * Used when creating or inviting users; pass plain value only to email, never persist.
 */
export function generateTemporaryPassword(length = 14): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[bytes[i]! % ALPHANUMERIC.length];
  }
  return result;
}
