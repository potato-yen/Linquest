import { AppError, parseAppError } from '../errors';

export class TerritoryError extends AppError {
  constructor(code: string, message: string, detail?: unknown) {
    super('TERRITORY', code, message, detail);
    this.name = 'TerritoryError';
  }
}

export function parseTerritoryRpcCode(error: unknown): AppError {
  return parseAppError('TERRITORY', error);
}
