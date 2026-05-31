import { AppError, parseAppError, getErrorMessage } from '../errors';

export class TeacherConsoleError extends AppError {
  constructor(code: string, message: string, detail?: unknown) {
    super('TEACHER_CONSOLE', code, message, detail);
    this.name = 'TeacherConsoleError';
  }
}

export function parseTeacherConsoleRpcCode(error: unknown): TeacherConsoleError {
  const appErr = parseAppError('TEACHER_CONSOLE', error);
  const code = appErr.code === 'UNKNOWN_ERROR' ? 'UNKNOWN_TEACHER_CONSOLE_ERROR' : appErr.code;
  return new TeacherConsoleError(code, appErr.message, appErr.detail);
}

export function teacherConsoleErrorMessage(error: unknown): string | null {
  if (error instanceof AppError && error.namespace === 'TEACHER_CONSOLE') {
    const msg = getErrorMessage(error.code, '');
    return msg || null;
  }
  return null;
}
