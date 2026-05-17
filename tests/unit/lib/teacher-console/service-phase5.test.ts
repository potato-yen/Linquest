import { createActivityWithCustomBank, deleteActivity } from '../../../../lib/teacher-console/service';
import { TeacherConsoleError } from '../../../../lib/teacher-console/errors';

function makeSb(rpcImpl: any) {
  return { rpc: jest.fn(rpcImpl) } as any;
}

const input = {
  class_id: 'c1',
  name: 'Act',
  ends_at: '2030-01-01T00:00:00Z',
  group_count: 4,
  map_size_target: 80,
  refresh_interval_hours: 12 as const,
  bank_name: 'b',
  rows: [{ prompt: 'p', correct_answer: 'a', meta: { part_of_speech: 'n.' } }],
};

describe('createActivityWithCustomBank', () => {
  it('sends all params and returns activity id', async () => {
    const sb = makeSb(async () => ({ data: 'act-1', error: null }));
    const id = await createActivityWithCustomBank(sb, input);
    expect(sb.rpc).toHaveBeenCalledWith('create_activity_with_custom_bank', {
      p_class_id: 'c1', p_name: 'Act', p_ends_at: '2030-01-01T00:00:00Z',
      p_group_count: 4, p_map_size_target: 80, p_refresh_interval_hours: 12,
      p_bank_name: 'b', p_rows: input.rows,
    });
    expect(id).toBe('act-1');
  });

  it('maps RPC error to TeacherConsoleError code', async () => {
    const sb = makeSb(async () => ({ data: null, error: { message: 'INVALID_CUSTOM_BANK_ROWS' } }));
    await expect(createActivityWithCustomBank(sb, input)).rejects.toMatchObject({
      code: 'INVALID_CUSTOM_BANK_ROWS',
    });
  });
});

describe('deleteActivity', () => {
  it('calls delete_activity with p_activity_id', async () => {
    const sb = makeSb(async () => ({ data: null, error: null }));
    await deleteActivity(sb, 'act-9');
    expect(sb.rpc).toHaveBeenCalledWith('delete_activity', { p_activity_id: 'act-9' });
  });

  it('maps ACTIVITY_NOT_FOUND', async () => {
    const sb = makeSb(async () => ({ data: null, error: { message: 'ACTIVITY_NOT_FOUND' } }));
    await expect(deleteActivity(sb, 'x')).rejects.toBeInstanceOf(TeacherConsoleError);
  });
});
