import { AppError, parseAppError, getErrorMessage } from '../errors';

export class TeacherConsoleError extends AppError {
  constructor(code: string, message: string, detail?: unknown) {
    super('TEACHER_CONSOLE', code, message, detail);
    this.name = 'TeacherConsoleError';
  }
}

export function parseTeacherConsoleRpcCode(error: unknown): AppError {
  return parseAppError('TEACHER_CONSOLE', error);
}

export function teacherConsoleErrorMessage(error: unknown): string | null {
  if (error instanceof AppError && error.namespace === 'TEACHER_CONSOLE') {
    const msg = getErrorMessage(error.code, '');
    return msg || null;
  }
  return null;
}
