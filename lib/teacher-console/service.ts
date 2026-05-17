import { SupabaseClient } from '@supabase/supabase-js';
import { initializeMap } from '../territory/generator';
import { runRefreshWave } from '../territory/refresh';
import { TerritoryParams } from '../territory/types';
import { parseTeacherConsoleRpcCode, TeacherConsoleError } from './errors';
import {
  ActivityDraftInput,
  CreateActivityWithCustomBankInput,
  PublishActivityContext,
  PublishGroupRow,
  TeacherConsoleAccuracy,
  TeacherConsoleActivitySettings,
  TeacherConsoleDashboard,
  TeacherConsoleMistakeRow,
  TeacherConsoleSettlement,
  TeacherActivitySummary,
} from './types';

export async function createActivityDraft(
  sb: SupabaseClient,
  input: ActivityDraftInput,
): Promise<string> {
  const { data, error } = await sb.rpc('create_activity_draft', {
    p_class_id: input.class_id,
    p_name: input.name,
    p_ends_at: input.ends_at,
    p_question_bank_id: input.question_bank_id,
    p_group_count: input.group_count,
    p_map_size_target: input.map_size_target,
    p_refresh_interval_hours: input.refresh_interval_hours,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return data as string;
}

export async function listMyActivities(
  sb: SupabaseClient,
  classId?: string,
): Promise<TeacherActivitySummary[]> {
  const { data, error } = await sb.rpc('list_my_activities', {
    p_class_id: classId ?? null,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return (data ?? []) as TeacherActivitySummary[];
}

export async function endActivityNow(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  const { error } = await sb.rpc('end_activity_now', {
    p_activity_id: activityId,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }
}

export async function getActivityDashboard(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleDashboard> {
  const { data, error } = await sb.rpc('get_activity_dashboard', {
    p_activity_id: activityId,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return data as TeacherConsoleDashboard;
}

export async function getActivityCommonMistakes(
  sb: SupabaseClient,
  activityId: string,
  limit = 10,
): Promise<TeacherConsoleMistakeRow[]> {
  const { data, error } = await sb.rpc('get_activity_common_mistakes', {
    p_activity_id: activityId,
    p_limit: limit,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return (data ?? []) as TeacherConsoleMistakeRow[];
}

export async function getActivityAccuracy(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleAccuracy> {
  const { data, error } = await sb.rpc('get_activity_accuracy', {
    p_activity_id: activityId,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return data as TeacherConsoleAccuracy;
}

export async function getActivitySettlement(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleSettlement> {
  const { data, error } = await sb.rpc('get_activity_settlement', {
    p_activity_id: activityId,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return data as TeacherConsoleSettlement;
}

export async function publishActivity(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  const context = await getPublishActivityContext(sb, activityId);
  const territoryParams = {
    map_size_target: context.settings.map_size_target,
    refresh_interval_hours: context.settings.refresh_interval_hours,
  } as Partial<TerritoryParams>;
  let started = false;

  try {
    const groups = await snapshotClassAndCreateGroups(sb, activityId);
    started = true;

    await initializeMap(sb, {
      activity_id: activityId,
      groups,
      params: territoryParams,
    });

    await runRefreshWave(sb, activityId, territoryParams);

    const { error: finalizeError } = await sb.rpc('finalize_activity_publish', {
      p_activity_id: activityId,
    });

    if (finalizeError) {
      throw finalizeError;
    }
  } catch (error) {
    const code = error instanceof TeacherConsoleError
      ? error.code
      : parseTeacherConsoleRpcCode(error instanceof Error ? error.message : '');
    const shouldRollback = started || code === 'GROUPS_ALREADY_EXIST';

    if (shouldRollback) {
      try {
        await rollbackActivityPublish(sb, activityId);
      } catch (rollbackError) {
        console.error('rollback_activity_publish failed', rollbackError);
      }
    }

    if (error instanceof TeacherConsoleError) {
      throw error;
    }

    const rpcMessage = error instanceof Error ? error.message : 'UNKNOWN_TEACHER_CONSOLE_ERROR';
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(rpcMessage), rpcMessage, error);
  }
}

async function snapshotClassAndCreateGroups(
  sb: SupabaseClient,
  activityId: string,
): Promise<PublishGroupRow[]> {
  const { data, error } = await sb.rpc('snapshot_class_and_create_groups', {
    p_activity_id: activityId,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }

  return (data ?? []) as PublishGroupRow[];
}

async function rollbackActivityPublish(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  const { error } = await sb.rpc('rollback_activity_publish', {
    p_activity_id: activityId,
  });

  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }
}

async function getPublishActivityContext(
  sb: SupabaseClient,
  activityId: string,
): Promise<PublishActivityContext> {
  const { data, error } = await sb
    .from('activities')
    .select('settings_json')
    .eq('id', activityId)
    .single();

  if (error || !data) {
    throw new TeacherConsoleError(
      'ACTIVITY_NOT_DRAFT',
      error?.message ?? `activity ${activityId} not found`,
      error,
    );
  }

  return {
    settings: pickTerritoryParams(data.settings_json),
  };
}

function pickTerritoryParams(
  settingsJson: Record<string, unknown>,
): TeacherConsoleActivitySettings {
  return {
    group_count: toInteger(settingsJson.group_count, 4),
    map_size_target: toInteger(settingsJson.map_size_target, 80),
    refresh_interval_hours: toRefreshInterval(settingsJson.refresh_interval_hours),
  };
}

function toInteger(value: unknown, fallback: number): number {
  return typeof value === 'number'
    ? Math.trunc(value)
    : typeof value === 'string'
      ? parseInt(value, 10)
      : fallback;
}

function toRefreshInterval(value: unknown): 6 | 8 | 12 | 24 {
  const parsed = toInteger(value, 12);

  if (parsed === 6 || parsed === 8 || parsed === 12 || parsed === 24) {
    return parsed;
  }

  return 12;
}

export async function createActivityWithCustomBank(
  sb: SupabaseClient,
  input: CreateActivityWithCustomBankInput,
): Promise<string> {
  const { data, error } = await sb.rpc('create_activity_with_custom_bank', {
    p_class_id: input.class_id,
    p_name: input.name,
    p_ends_at: input.ends_at,
    p_group_count: input.group_count,
    p_map_size_target: input.map_size_target,
    p_refresh_interval_hours: input.refresh_interval_hours,
    p_bank_name: input.bank_name,
    p_rows: input.rows,
  });
  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }
  return data as string;
}

export async function deleteActivity(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  const { error } = await sb.rpc('delete_activity', { p_activity_id: activityId });
  if (error) {
    throw new TeacherConsoleError(parseTeacherConsoleRpcCode(error.message), error.message, error);
  }
}
