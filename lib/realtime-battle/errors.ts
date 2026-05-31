import { AppError, parseAppError } from '../errors';

export class BattleError extends AppError {
  constructor(code: string, message: string, detail?: unknown) {
    super('BATTLE', code, message, detail);
    this.name = 'BattleError';
  }
}

export function parseBattleRpcCode(error: unknown): BattleError {
  const appErr = parseAppError('BATTLE', error);
  return new BattleError(appErr.code, appErr.message, appErr.detail);
}
