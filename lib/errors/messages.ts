// lib/errors/messages.ts
import { DomainNamespace } from './types';

export const ERROR_MESSAGES: Record<string, string> = {
  // Common / General
  'NOT_AUTHENTICATED': '登入狀態已失效，請重新登入。',
  'ACTIVITY_NOT_ACTIVE': '此活動目前不是進行中狀態。',
  
  // Auth
  'INVALID_CREDENTIALS': '帳號或密碼錯誤。',
  'EMAIL_TAKEN': '此 Email 已被使用。',
  'USER_NOT_FOUND': '找不到此使用者。',
  'WEAK_PASSWORD': '密碼強度不足。',
  'EMAIL_NOT_CONFIRMED': '請先至信箱確認您的 Email。',

  // Teacher Console
  'NOT_CLASS_OWNER': '你不是這個班級的擁有者，無法操作。',
  'INVALID_ENDS_AT': '活動結束時間設定無效。',
  'INVALID_GROUP_COUNT': '分組數設定無效（需 2–10 組）。',
  'INVALID_MAP_SIZE': '地圖大小設定無效。',
  'INVALID_REFRESH_INTERVAL': '補給波間隔設定無效。',
  'INVALID_CUSTOM_BANK_ROWS': '自訂題庫內容格式有誤，請檢查 CSV。',
  'INSUFFICIENT_CUSTOM_BANK_ROWS': '自訂題庫題數不足，至少需要 18 題才能支援 territory 最大挑戰。',
  'INSUFFICIENT_DISTINCT_ANSWERS': '自訂題庫的英文答案種類不足，至少需要 4 個不重複答案供誘答抽樣。',
  'QUESTION_BANK_NOT_FOUND': '找不到指定的題庫。',
  'ACTIVITY_NOT_FOUND': '找不到此活動。',
  'ACTIVITY_NOT_DRAFT': '此活動已發佈或已結束，無法再次發佈。',
  'GROUPS_ALREADY_EXIST': '分組已存在（可能上次發佈未完成）。請稍後重試。',
  'NOT_ENOUGH_MEMBERS': '班級人數不足以分組。請先讓學生用班級代碼加入，或在開新活動時調低分組數。',
  'MAP_NOT_READY': '地圖尚未建立完成，請稍後重試。',
  'ACTIVITY_NOT_ENDED': '此活動尚未結束。',

  // Territory / Battle
  'ALREADY_OWNED': '此領地已被佔領。',
  'NOT_ADJACENT': '只能挑戰相鄰的領地。',
  'PROTECTED': '此領地目前處於保護狀態。',
  'CAPITAL_IMMUNE': '首都目前免疫攻擊。',
  'LOCKED_BY_OTHER': '其他玩家正在挑戰此領地。',
  'INSUFFICIENT_TREASURY': '國庫資金不足。',
  'TILE_NOT_FOUND': '找不到指定的領地。',
  'NOT_GROUP_MEMBER': '你不是此組別的成員。',
  'INVALID_OPPONENT': '無效的對手。',
  'OPPONENT_ALREADY_IN_BATTLE': '對手正在進行另一場對戰中。',
  'BATTLE_NOT_FOUND': '找不到對戰紀錄。',
  'INVITE_EXPIRED': '對戰邀請已過期。',
  'QUESTION_DEADLINE_PASSED': '答題時間已過。',
};

export function getErrorMessage(code: string, fallback: string): string {
  return ERROR_MESSAGES[code] || fallback;
}
