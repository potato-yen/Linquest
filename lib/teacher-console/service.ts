import { SupabaseClient } from '@supabase/supabase-js';
import { performSbCall } from '../supabase';
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
  TeacherConsoleLiveEvent,
  TeacherConsoleMistakeRow,
  TeacherConsoleSettlement,
  TeacherConsoleStudentStat,
  TeacherActivitySummary,
} from './types';

export async function createActivityDraft(
  sb: SupabaseClient,
  input: ActivityDraftInput,
): Promise<string> {
  return performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('create_activity_draft', {
      p_class_id: input.class_id,
      p_name: input.name,
      p_ends_at: input.ends_at,
      p_question_bank_id: input.question_bank_id,
      p_group_count: input.group_count,
      p_map_size_target: input.map_size_target,
      p_refresh_interval_hours: input.refresh_interval_hours,
    }),
    parseTeacherConsoleRpcCode
  );
}

export async function listMyActivities(
  sb: SupabaseClient,
  classId?: string,
): Promise<TeacherActivitySummary[]> {
  const data = await performSbCall<TeacherActivitySummary[] | null>(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('list_my_activities', {
      p_class_id: classId ?? null,
    }),
    parseTeacherConsoleRpcCode
  );
  return data ?? [];
}

export async function endActivityNow(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  await performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('end_activity_now', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
}

export async function getActivityDashboard(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleDashboard> {
  return performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('get_activity_dashboard', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
}

export async function getActivityCommonMistakes(
  sb: SupabaseClient,
  activityId: string,
  limit = 10,
): Promise<TeacherConsoleMistakeRow[]> {
  const data = await performSbCall<TeacherConsoleMistakeRow[] | null>(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('get_activity_common_mistakes', {
      p_activity_id: activityId,
      p_limit: limit,
    }),
    parseTeacherConsoleRpcCode
  );
  return data ?? [];
}

export async function getActivityAccuracy(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleAccuracy> {
  return performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('get_activity_accuracy', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
}

export async function getActivitySettlement(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleSettlement> {
  return performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('get_activity_settlement', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
}

export async function getActivityLiveFeed(
  sb: SupabaseClient,
  activityId: string,
  limit = 50,
): Promise<TeacherConsoleLiveEvent[]> {
  const data = await performSbCall<TeacherConsoleLiveEvent[] | null>(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('get_activity_live_feed', {
      p_activity_id: activityId,
      p_limit: limit,
    }),
    parseTeacherConsoleRpcCode
  );
  return data ?? [];
}

export async function getActivityStudentStats(
  sb: SupabaseClient,
  activityId: string,
): Promise<TeacherConsoleStudentStat[]> {
  const data = await performSbCall<TeacherConsoleStudentStat[] | null>(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('get_activity_student_stats', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
  return data ?? [];
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

    await performSbCall(sb, 'TEACHER_CONSOLE', async () =>
      sb.rpc('finalize_activity_publish', {
        p_activity_id: activityId,
      }),
      parseTeacherConsoleRpcCode
    );
  } catch (error) {
    const code = error instanceof TeacherConsoleError
      ? error.code
      : parseTeacherConsoleRpcCode(error).code;
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

    throw parseTeacherConsoleRpcCode(error);
  }
}

async function snapshotClassAndCreateGroups(
  sb: SupabaseClient,
  activityId: string,
): Promise<PublishGroupRow[]> {
  const data = await performSbCall<PublishGroupRow[] | null>(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('snapshot_class_and_create_groups', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
  return data ?? [];
}

async function rollbackActivityPublish(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  await performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('rollback_activity_publish', {
      p_activity_id: activityId,
    }),
    parseTeacherConsoleRpcCode
  );
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
  return performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('create_activity_with_custom_bank', {
      p_class_id: input.class_id,
      p_name: input.name,
      p_ends_at: input.ends_at,
      p_group_count: input.group_count,
      p_map_size_target: input.map_size_target,
      p_refresh_interval_hours: input.refresh_interval_hours,
      p_bank_name: input.bank_name,
      p_rows: input.rows,
    }),
    parseTeacherConsoleRpcCode
  );
}

export async function deleteActivity(
  sb: SupabaseClient,
  activityId: string,
): Promise<void> {
  await performSbCall(sb, 'TEACHER_CONSOLE', async () =>
    sb.rpc('delete_activity', { p_activity_id: activityId }),
    parseTeacherConsoleRpcCode
  );
}
