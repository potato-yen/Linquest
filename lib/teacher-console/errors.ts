export type TeacherConsoleErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_CLASS_OWNER'
  | 'INVALID_ENDS_AT'
  | 'INVALID_GROUP_COUNT'
  | 'INVALID_MAP_SIZE'
  | 'INVALID_REFRESH_INTERVAL'
  | 'QUESTION_BANK_NOT_FOUND'
  | 'ACTIVITY_NOT_DRAFT'
  | 'GROUPS_ALREADY_EXIST'
  | 'NOT_ENOUGH_MEMBERS'
  | 'MAP_NOT_READY'
  | 'ACTIVITY_NOT_ACTIVE'
  | 'ACTIVITY_NOT_ENDED'
  | 'UNKNOWN_TEACHER_CONSOLE_ERROR';

const TEACHER_CONSOLE_ERROR_CODES: TeacherConsoleErrorCode[] = [
  'NOT_AUTHENTICATED',
  'NOT_CLASS_OWNER',
  'INVALID_ENDS_AT',
  'INVALID_GROUP_COUNT',
  'INVALID_MAP_SIZE',
  'INVALID_REFRESH_INTERVAL',
  'QUESTION_BANK_NOT_FOUND',
  'ACTIVITY_NOT_DRAFT',
  'GROUPS_ALREADY_EXIST',
  'NOT_ENOUGH_MEMBERS',
  'MAP_NOT_READY',
  'ACTIVITY_NOT_ACTIVE',
  'ACTIVITY_NOT_ENDED',
  'UNKNOWN_TEACHER_CONSOLE_ERROR',
];

export class TeacherConsoleError extends Error {
  code: TeacherConsoleErrorCode;
  detail?: unknown;

  constructor(code: TeacherConsoleErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'TeacherConsoleError';
    this.code = code;
    this.detail = detail;
  }
}

export function parseTeacherConsoleRpcCode(message: string): TeacherConsoleErrorCode {
  return TEACHER_CONSOLE_ERROR_CODES.find((code) => message.includes(code))
    ?? 'UNKNOWN_TEACHER_CONSOLE_ERROR';
}
