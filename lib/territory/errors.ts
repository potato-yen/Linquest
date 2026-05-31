import { AppError, parseAppError } from '../errors';

export type TerritoryErrorCode =
  | 'ALREADY_OWNED'
  | 'NOT_ADJACENT'
  | 'PROTECTED'
  | 'CAPITAL_IMMUNE'
  | 'LOCKED_BY_OTHER'
  | 'INSUFFICIENT_TREASURY'
  | 'TILE_NOT_FOUND'
  | 'NOT_GROUP_MEMBER'
  | 'NOT_AUTHENTICATED'
  | 'ACTIVITY_NOT_ACTIVE'
  | 'INVALID_REFRESH'
  | 'CHALLENGE_NOT_FOUND'
  | 'CHALLENGE_USER_MISMATCH'
  | 'CHALLENGE_ID_MISMATCH'
  | 'CHALLENGE_EXPIRED'
  | 'BATTLE_DISPATCH_REQUIRED';

export class TerritoryError extends AppError {
  constructor(code: string, message: string, detail?: unknown) {
    super('TERRITORY', code, message, detail);
    this.name = 'TerritoryError';
  }
}

export function parseTerritoryRpcCode(error: unknown): TerritoryError {
  const appErr = parseAppError('TERRITORY', error);
  return new TerritoryError(appErr.code, appErr.message, appErr.detail);
}
