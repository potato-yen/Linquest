import { SupabaseClient } from '@supabase/supabase-js';
import { TerritoryError, TerritoryErrorCode } from './errors';
import { ChallengeKind, ChallengeSpec, HexTile, TerritoryParams } from './types';

export interface AttemptCaptureInput {
  activity_id: string;
  tile_id: string;
  params?: Partial<TerritoryParams>;
}

export interface AttemptCaptureResult {
  challenge_id: string;
  spec: ChallengeSpec;
  tile: HexTile;
}

export interface ResolveChallengeInput {
  activity_id: string;
  challenge_id: string;
  tile_id: string;
  kind: ChallengeKind;
  all_correct: boolean;
  spec: ChallengeSpec;
  params?: Partial<TerritoryParams>;
  special_protected_until?: string | null;
}

export async function attemptCapture(
  sb: SupabaseClient,
  input: AttemptCaptureInput,
): Promise<AttemptCaptureResult> {
  const { data, error } = await sb.rpc('attempt_capture', {
    p_activity_id: input.activity_id,
    p_tile_id: input.tile_id,
  });

  if (error) {
    throw new TerritoryError(parseRpcCode(error.message), error.message, error);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    challenge_id: row.challenge_id as string,
    spec: row.spec as ChallengeSpec,
    tile: row.tile as HexTile,
  };
}

export async function resolveChallenge(
  sb: SupabaseClient,
  input: ResolveChallengeInput,
): Promise<void> {
  await requireUserId(sb);
  const { error } = await sb.rpc('resolve_challenge', {
    p_activity_id: input.activity_id,
    p_tile_id: input.tile_id,
    p_challenge_id: input.challenge_id,
    p_all_correct: input.all_correct,
  });

  if (error) {
    throw new TerritoryError(parseRpcCode(error.message), error.message, error);
  }
}

async function requireUserId(sb: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await sb.auth.getSession();
  const userId = session?.user.id;

  if (!userId) {
    throw new TerritoryError('NOT_AUTHENTICATED', 'not authenticated');
  }

  return userId;
}

function parseRpcCode(message: string): TerritoryErrorCode {
  const codes: TerritoryErrorCode[] = [
    'ALREADY_OWNED',
    'NOT_ADJACENT',
    'PROTECTED',
    'CAPITAL_IMMUNE',
    'LOCKED_BY_OTHER',
    'INSUFFICIENT_TREASURY',
    'TILE_NOT_FOUND',
    'NOT_GROUP_MEMBER',
    'NOT_AUTHENTICATED',
    'ACTIVITY_NOT_ACTIVE',
    'INVALID_REFRESH',
    'CHALLENGE_NOT_FOUND',
    'CHALLENGE_USER_MISMATCH',
    'CHALLENGE_ID_MISMATCH',
    'CHALLENGE_EXPIRED',
    'BATTLE_DISPATCH_REQUIRED',
  ];

  return codes.find((code) => message.includes(code)) ?? 'CHALLENGE_NOT_FOUND';
}
