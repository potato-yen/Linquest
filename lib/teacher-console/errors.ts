export type TeacherConsoleErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_CLASS_OWNER'
  | 'INVALID_ENDS_AT'
  | 'INVALID_GROUP_COUNT'
  | 'INVALID_MAP_SIZE'
  | 'INVALID_REFRESH_INTERVAL'
  | 'INVALID_CUSTOM_BANK_ROWS'
  | 'INSUFFICIENT_DISTINCT_ANSWERS'
  | 'QUESTION_BANK_NOT_FOUND'
  | 'ACTIVITY_NOT_FOUND'
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
  'INVALID_CUSTOM_BANK_ROWS',
  'INSUFFICIENT_DISTINCT_ANSWERS',
  'QUESTION_BANK_NOT_FOUND',
  'ACTIVITY_NOT_FOUND',
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

const TEACHER_CONSOLE_ERROR_MESSAGES: Record<TeacherConsoleErrorCode, string> = {
  NOT_AUTHENTICATED: '登入狀態已失效，請重新登入。',
  NOT_CLASS_OWNER: '你不是這個班級的擁有者，無法操作。',
  INVALID_ENDS_AT: '活動結束時間設定無效。',
  INVALID_GROUP_COUNT: '分組數設定無效（需 2–10 組）。',
  INVALID_MAP_SIZE: '地圖大小設定無效。',
  INVALID_REFRESH_INTERVAL: '補給波間隔設定無效。',
  INVALID_CUSTOM_BANK_ROWS: '自訂題庫內容格式有誤，請檢查 CSV。',
  INSUFFICIENT_DISTINCT_ANSWERS: '英文答案不重複數量不足，至少需要 20 題。',
  QUESTION_BANK_NOT_FOUND: '找不到指定的題庫。',
  ACTIVITY_NOT_FOUND: '找不到此活動。',
  ACTIVITY_NOT_DRAFT: '此活動已發佈或已結束，無法再次發佈。',
  GROUPS_ALREADY_EXIST: '分組已存在（可能上次發佈未完成）。請稍後重試。',
  NOT_ENOUGH_MEMBERS:
    '班級人數不足以分組。請先讓學生用班級代碼加入，或在開新活動時調低分組數。',
  MAP_NOT_READY: '地圖尚未建立完成，請稍後重試。',
  ACTIVITY_NOT_ACTIVE: '此活動目前不是進行中狀態。',
  ACTIVITY_NOT_ENDED: '此活動尚未結束。',
  UNKNOWN_TEACHER_CONSOLE_ERROR: '發生未知錯誤，請稍後再試。',
};

// User-facing zh message for a teacher-console failure. Returns null when the
// error is not a recognised TeacherConsoleError (or is the generic unknown
// code) so the caller can fall back to the generic mapError() message.
export function teacherConsoleErrorMessage(error: unknown): string | null {
  if (!(error instanceof TeacherConsoleError)) {
    return null;
  }
  if (error.code === 'UNKNOWN_TEACHER_CONSOLE_ERROR') {
    return null;
  }
  return TEACHER_CONSOLE_ERROR_MESSAGES[error.code];
}
