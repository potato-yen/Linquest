// lib/errors/index.ts
export * from './types';
export * from './messages';

import { AppError, DomainNamespace } from './types';

/**
 * Parses a raw error (e.g. from Supabase RPC) into an AppError if it contains
 * a known error code string.
 */
export function parseAppError(
  namespace: DomainNamespace,
  error: unknown,
  fallbackMessage: string = '發生未知錯誤',
): AppError {
  if (error instanceof AppError) return error;

  let message = fallbackMessage;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as any).message);
  } else if (error) {
    message = String(error);
  }
  
  // Search for our custom UPPER_SNAKE_CASE codes in the message
  let match = message.match(/[A-Z_]{5,}/);
  let code = match ? match[0] : 'UNKNOWN_ERROR';

  // Special handling for Supabase Auth natural language errors
  if (code === 'UNKNOWN_ERROR') {
    if (/invalid login credentials/i.test(message)) code = 'INVALID_CREDENTIALS';
    else if (/user already registered/i.test(message)) code = 'EMAIL_TAKEN';
    else if (/password should be/i.test(message)) code = 'WEAK_PASSWORD';
    else if (/email not confirmed/i.test(message)) code = 'EMAIL_NOT_CONFIRMED';
  }

  return new AppError(namespace, code, message, error);
}
