// lib/ui/error/mapError.ts
export type ScreenErrorKind = 'network' | 'auth' | 'server' | 'unknown';

export interface ScreenError {
  kind: ScreenErrorKind;
  message: string;          // user-facing 中文 message
  cause?: unknown;          // dev only — never surface to UI
}

const MESSAGES: Record<ScreenErrorKind, string> = {
  network: '網路連線異常，請檢查網路後重試。',
  auth: '登入狀態已失效，請重新登入。',
  server: '伺服器暫時無法回應，請稍後再試。',
  unknown: '發生未知錯誤，請稍後再試。',
};

export function mapError(raw: unknown): ScreenError {
  if (raw instanceof TypeError && /network/i.test(raw.message)) {
    return { kind: 'network', message: MESSAGES.network, cause: raw };
  }
  if (raw && typeof raw === 'object' && 'status' in raw) {
    const status = (raw as { status?: number }).status;
    if (status === 401 || status === 403) {
      return { kind: 'auth', message: MESSAGES.auth, cause: raw };
    }
    if (typeof status === 'number' && status >= 500) {
      return { kind: 'server', message: MESSAGES.server, cause: raw };
    }
  }
  return { kind: 'unknown', message: MESSAGES.unknown, cause: raw };
}
