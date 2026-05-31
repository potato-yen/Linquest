import {
  createActivityDraft,
  endActivityNow,
  getActivityAccuracy,
  getActivityCommonMistakes,
  getActivityDashboard,
  getActivitySettlement,
  listMyActivities,
  publishActivity,
} from '../../../../lib/teacher-console/service';
import { parseTeacherConsoleRpcCode, TeacherConsoleError } from '../../../../lib/teacher-console/errors';
import { TEACHER_CONSOLE_DEFAULTS } from '../../../../lib/teacher-console/types';
import { initializeMap } from '../../../../lib/territory/generator';
import { runRefreshWave } from '../../../../lib/territory/refresh';

jest.mock('../../../../lib/territory/generator', () => ({
  initializeMap: jest.fn(),
}));

jest.mock('../../../../lib/territory/refresh', () => ({
  runRefreshWave: jest.fn(),
}));

function makeSb() {
  return {
    rpc: jest.fn(),
    from: jest.fn(),
  };
}

describe('teacher-console service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('exports teacher-console defaults for wizard consumers', () => {
    expect(TEACHER_CONSOLE_DEFAULTS).toMatchObject({
      group_count_default: 4,
      group_count_min: 2,
      group_count_max: 10,
      map_size_default: 80,
      map_size_min: 50,
      map_size_max: 120,
      refresh_interval_default_hours: 12,
      refresh_interval_choices: [6, 8, 12, 24],
      sudden_death_window_hours: 12,
      mistakes_default_limit: 10,
      mistakes_max_limit: 50,
    });
    expect(TEACHER_CONSOLE_DEFAULTS.group_color_palette).toHaveLength(10);
  });

  it('creates draft activities through the dedicated RPC', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValue({ data: 'activity-1', error: null });

    await expect(createActivityDraft(sb as never, {
      class_id: 'class-1',
      name: 'Week 3 Battle',
      ends_at: '2026-05-19T00:00:00.000Z',
      question_bank_id: 'bank-1',
      group_count: 4,
      map_size_target: 80,
      refresh_interval_hours: 12,
    })).resolves.toBe('activity-1');

    expect(sb.rpc).toHaveBeenCalledWith('create_activity_draft', {
      p_class_id: 'class-1',
      p_name: 'Week 3 Battle',
      p_ends_at: '2026-05-19T00:00:00.000Z',
      p_question_bank_id: 'bank-1',
      p_group_count: 4,
      p_map_size_target: 80,
      p_refresh_interval_hours: 12,
    });
  });

  it('lists activities and ends activities through their RPCs', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'activity-1',
          status: 'draft',
        },
      ],
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(listMyActivities(sb as never, 'class-1')).resolves.toEqual([
      expect.objectContaining({ id: 'activity-1', status: 'draft' }),
    ]);
    await expect(endActivityNow(sb as never, 'activity-1')).resolves.toBeUndefined();

    expect(sb.rpc).toHaveBeenNthCalledWith(1, 'list_my_activities', {
      p_class_id: 'class-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'end_activity_now', {
      p_activity_id: 'activity-1',
    });
  });

  it('forwards dashboard, analytics, and settlement reads to their RPCs', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValueOnce({
      data: {
        activity: {
          id: 'activity-1',
          status: 'active',
        },
        groups: [],
        map_summary: {
          total_tiles: 60,
        },
      },
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({
      data: [
        { question_id: 'question-1', prompt: 'abandon', wrong_count: 3 },
      ],
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({
      data: {
        overall: { attempts: 4, correct: 3, accuracy: 0.75 },
        by_context: {
          territory: { attempts: 3, correct: 2, accuracy: 2 / 3 },
          battle: { attempts: 1, correct: 1, accuracy: 1 },
        },
      },
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({
      data: {
        rankings_treasury: [],
        rankings_territory: [],
        common_mistakes: [],
        accuracy: {
          overall: { attempts: 4, correct: 3, accuracy: 0.75 },
          by_context: {
            territory: { attempts: 3, correct: 2, accuracy: 2 / 3 },
            battle: { attempts: 1, correct: 1, accuracy: 1 },
          },
        },
      },
      error: null,
    });

    await expect(getActivityDashboard(sb as never, 'activity-1')).resolves.toEqual(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'activity-1', status: 'active' }),
      }),
    );
    await expect(getActivityCommonMistakes(sb as never, 'activity-1', 5)).resolves.toEqual([
      expect.objectContaining({ question_id: 'question-1', wrong_count: 3 }),
    ]);
    await expect(getActivityAccuracy(sb as never, 'activity-1')).resolves.toEqual(
      expect.objectContaining({
        overall: expect.objectContaining({ attempts: 4, correct: 3 }),
      }),
    );
    await expect(getActivitySettlement(sb as never, 'activity-1')).resolves.toEqual(
      expect.objectContaining({
        rankings_treasury: [],
        rankings_territory: [],
      }),
    );

    expect(sb.rpc).toHaveBeenNthCalledWith(1, 'get_activity_dashboard', {
      p_activity_id: 'activity-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'get_activity_common_mistakes', {
      p_activity_id: 'activity-1',
      p_limit: 5,
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(3, 'get_activity_accuracy', {
      p_activity_id: 'activity-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(4, 'get_activity_settlement', {
      p_activity_id: 'activity-1',
    });
  });

  it('publishes activities by snapshotting groups, initializing a map, running wave 0, then finalizing', async () => {
    const sb = makeSb();
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: {
        settings_json: {
          map_size_target: 60,
          refresh_interval_hours: 12,
        },
      },
      error: null,
    });
    sb.from.mockReturnValue({ select, eq, single });
    sb.rpc.mockResolvedValueOnce({
      data: [
        { group_id: 'group-1', member_count: 2 },
        { group_id: 'group-2', member_count: 2 },
      ],
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });

    (initializeMap as jest.Mock).mockResolvedValue({ map_id: 'map-1', tile_count: 60 });
    (runRefreshWave as jest.Mock).mockResolvedValue({ wave_id: 'wave-1' });

    await expect(publishActivity(sb as never, 'activity-1')).resolves.toBeUndefined();

    expect(sb.from).toHaveBeenCalledWith('activities');
    expect(select).toHaveBeenCalledWith('settings_json');
    expect(eq).toHaveBeenCalledWith('id', 'activity-1');
    expect(initializeMap).toHaveBeenCalledWith(sb, {
      activity_id: 'activity-1',
      groups: [
        { group_id: 'group-1', member_count: 2 },
        { group_id: 'group-2', member_count: 2 },
      ],
      params: {
        map_size_target: 60,
        refresh_interval_hours: 12,
      },
    });
    expect(runRefreshWave).toHaveBeenCalledWith(sb, 'activity-1', {
      map_size_target: 60,
      refresh_interval_hours: 12,
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(1, 'snapshot_class_and_create_groups', {
      p_activity_id: 'activity-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'finalize_activity_publish', {
      p_activity_id: 'activity-1',
    });
  });

  it('rolls back publish state when map initialization fails', async () => {
    const sb = makeSb();
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: {
        settings_json: {
          map_size_target: 60,
          refresh_interval_hours: 12,
        },
      },
      error: null,
    });
    sb.from.mockReturnValue({ select, eq, single });
    sb.rpc.mockResolvedValueOnce({
      data: [
        { group_id: 'group-1', member_count: 2 },
      ],
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });

    (initializeMap as jest.Mock).mockRejectedValue(new Error('map failed'));

    await expect(publishActivity(sb as never, 'activity-1')).rejects.toEqual(
      expect.objectContaining<Partial<TeacherConsoleError>>({
        name: 'TeacherConsoleError',
      }),
    );

    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'rollback_activity_publish', {
      p_activity_id: 'activity-1',
    });
  });

  it('attempts rollback when publish retries hit GROUPS_ALREADY_EXIST before started is set', async () => {
    const sb = makeSb();
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: {
        settings_json: {
          map_size_target: 60,
          refresh_interval_hours: 12,
        },
      },
      error: null,
    });
    sb.from.mockReturnValue({ select, eq, single });
    sb.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'GROUPS_ALREADY_EXIST' },
    });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(publishActivity(sb as never, 'activity-1')).rejects.toEqual(
      expect.objectContaining<Partial<TeacherConsoleError>>({
        name: 'TeacherConsoleError',
        code: 'GROUPS_ALREADY_EXIST',
      }),
    );

    expect(sb.rpc).toHaveBeenNthCalledWith(1, 'snapshot_class_and_create_groups', {
      p_activity_id: 'activity-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'rollback_activity_publish', {
      p_activity_id: 'activity-1',
    });
  });

  it('preserves the original publish error even if rollback also fails', async () => {
    const sb = makeSb();
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: {
        settings_json: {
          map_size_target: 60,
          refresh_interval_hours: 12,
        },
      },
      error: null,
    });
    sb.from.mockReturnValue({ select, eq, single });
    sb.rpc.mockResolvedValueOnce({
      data: [
        { group_id: 'group-1', member_count: 2 },
      ],
      error: null,
    });
    sb.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ACTIVITY_NOT_DRAFT' },
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (initializeMap as jest.Mock).mockRejectedValue(new Error('map failed'));

    await expect(publishActivity(sb as never, 'activity-1')).rejects.toEqual(
      expect.objectContaining<Partial<TeacherConsoleError>>({
        name: 'TeacherConsoleError',
        message: 'map failed',
      }),
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'rollback_activity_publish failed',
      expect.objectContaining({
        code: 'ACTIVITY_NOT_DRAFT',
      }),
    );

    consoleErrorSpy.mockRestore();
  });

  it('maps RPC failures into TeacherConsoleError instances', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValue({
      data: null,
      error: { message: 'NOT_ENOUGH_MEMBERS' },
    });

    await expect(endActivityNow(sb as never, 'activity-1')).rejects.toEqual(
      expect.objectContaining<Partial<TeacherConsoleError>>({
        name: 'TeacherConsoleError',
        code: 'NOT_ENOUGH_MEMBERS',
      }),
    );
  });

  it('maps phase 5 RPC error codes', () => {
    expect(parseTeacherConsoleRpcCode('INVALID_CUSTOM_BANK_ROWS').code).toBe('INVALID_CUSTOM_BANK_ROWS');
    expect(parseTeacherConsoleRpcCode('ACTIVITY_NOT_FOUND').code).toBe('ACTIVITY_NOT_FOUND');
  });
});
