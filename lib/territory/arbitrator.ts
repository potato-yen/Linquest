import { SupabaseClient } from '@supabase/supabase-js';
import { isAdjacent } from './coords';
import { TerritoryError, TerritoryErrorCode } from './errors';
import { resolveChallengeSpec } from './challenge-spec';
import { ChallengeKind, ChallengeSpec, HexTile, TERRITORY_DEFAULTS, TerritoryParams } from './types';

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
  const params = { ...TERRITORY_DEFAULTS, ...(input.params ?? {}) };
  const userId = await requireUserId(sb);
  const activity = await loadActivity(sb, input.activity_id);

  if (activity.status !== 'active') {
    throw new TerritoryError('ACTIVITY_NOT_ACTIVE', 'activity is not active');
  }

  const myGroupId = await loadUserGroupId(sb, input.activity_id, userId);
  const tile = await loadTile(sb, input.tile_id);
  const ownedTiles = await loadOwnedTiles(sb, myGroupId);
  const adjacent = ownedTiles.some((ownedTile) =>
    isAdjacent({ q: ownedTile.q, r: ownedTile.r }, { q: tile.q, r: tile.r }),
  );

  if (!adjacent) {
    throw new TerritoryError('NOT_ADJACENT', 'tile is not adjacent to your territory');
  }

  const spec = resolveChallengeSpec(tile, myGroupId, params);
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
    spec,
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

async function loadActivity(sb: SupabaseClient, activityId: string): Promise<{ id: string; status: string }> {
  const { data, error } = await sb
    .from('activities')
    .select('id, status')
    .eq('id', activityId)
    .single();

  if (error || !data) {
    throw new TerritoryError('ACTIVITY_NOT_ACTIVE', 'activity not found', error);
  }

  return data as { id: string; status: string };
}

async function loadUserGroupId(
  sb: SupabaseClient,
  activityId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await sb
    .from('group_members')
    .select('group_id, groups!inner(activity_id)')
    .eq('user_id', userId)
    .eq('groups.activity_id', activityId)
    .maybeSingle();

  if (error) {
    throw new TerritoryError('NOT_GROUP_MEMBER', error.message, error);
  }

  if (!data) {
    throw new TerritoryError('NOT_GROUP_MEMBER', 'user is not in any group for this activity');
  }

  return data.group_id;
}

async function loadTile(sb: SupabaseClient, tileId: string): Promise<HexTile> {
  const { data, error } = await sb.from('hex_tiles').select('*').eq('id', tileId).single();

  if (error || !data) {
    throw new TerritoryError('TILE_NOT_FOUND', 'tile not found', error);
  }

  return data as HexTile;
}

async function loadOwnedTiles(
  sb: SupabaseClient,
  groupId: string,
): Promise<Array<Pick<HexTile, 'q' | 'r'>>> {
  const { data, error } = await sb
    .from('hex_tiles')
    .select('q, r')
    .eq('owner_group_id', groupId);

  if (error) {
    throw new TerritoryError('NOT_GROUP_MEMBER', error.message, error);
  }

  return (data ?? []) as Array<Pick<HexTile, 'q' | 'r'>>;
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
