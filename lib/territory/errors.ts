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

export class TerritoryError extends Error {
  code: TerritoryErrorCode;
  detail?: unknown;

  constructor(code: TerritoryErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'TerritoryError';
    this.code = code;
    this.detail = detail;
  }
}
