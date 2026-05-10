export type BattleErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'ACTIVITY_NOT_ACTIVE'
  | 'NOT_GROUP_MEMBER'
  | 'INVALID_OPPONENT'
  | 'TILE_NOT_FOUND'
  | 'TILE_NOT_ELIGIBLE'
  | 'CAPITAL_IMMUNE'
  | 'PROTECTED'
  | 'LOCKED_BY_OTHER'
  | 'INSUFFICIENT_TREASURY'
  | 'QUESTION_POOL_TOO_SMALL'
  | 'NOT_YOUR_INVITE'
  | 'BATTLE_NOT_PENDING'
  | 'INVITE_EXPIRED'
  | 'BATTLE_NOT_FOUND'
  | 'BATTLE_NOT_IN_PROGRESS'
  | 'INDEX_IN_FUTURE'
  | 'NOT_A_PLAYER'
  | 'NOT_REVEALED_YET'
  | 'QUESTION_DEADLINE_PASSED'
  | 'ALREADY_LOCKED'
  | 'UNKNOWN_BATTLE_ERROR';

const BATTLE_ERROR_CODES: BattleErrorCode[] = [
  'NOT_AUTHENTICATED',
  'ACTIVITY_NOT_ACTIVE',
  'NOT_GROUP_MEMBER',
  'INVALID_OPPONENT',
  'TILE_NOT_FOUND',
  'TILE_NOT_ELIGIBLE',
  'CAPITAL_IMMUNE',
  'PROTECTED',
  'LOCKED_BY_OTHER',
  'INSUFFICIENT_TREASURY',
  'QUESTION_POOL_TOO_SMALL',
  'NOT_YOUR_INVITE',
  'BATTLE_NOT_PENDING',
  'INVITE_EXPIRED',
  'BATTLE_NOT_FOUND',
  'BATTLE_NOT_IN_PROGRESS',
  'INDEX_IN_FUTURE',
  'NOT_A_PLAYER',
  'NOT_REVEALED_YET',
  'QUESTION_DEADLINE_PASSED',
  'ALREADY_LOCKED',
  'UNKNOWN_BATTLE_ERROR',
];

export class BattleError extends Error {
  code: BattleErrorCode;
  detail?: unknown;

  constructor(code: BattleErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'BattleError';
    this.code = code;
    this.detail = detail;
  }
}

export function parseBattleRpcCode(message: string): BattleErrorCode {
  return BATTLE_ERROR_CODES.find((code) => message.includes(code)) ?? 'UNKNOWN_BATTLE_ERROR';
}
