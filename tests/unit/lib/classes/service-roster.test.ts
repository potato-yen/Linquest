import { listClassRoster } from '../../../../lib/classes/service';

function makeSb(rpcImpl: any) {
  return { rpc: jest.fn(rpcImpl) } as any;
}

describe('listClassRoster', () => {
  it('calls list_class_roster and returns rows', async () => {
    const rows = [{ user_id: 'u1', display_name: 'A', joined_at: '2026-05-17T00:00:00Z' }];
    const sb = makeSb(async () => ({ data: rows, error: null }));
    const out = await listClassRoster(sb, 'class-1');
    expect(sb.rpc).toHaveBeenCalledWith('list_class_roster', { p_class_id: 'class-1' });
    expect(out).toEqual(rows);
  });

  it('returns [] when RPC yields null data', async () => {
    const sb = makeSb(async () => ({ data: null, error: null }));
    expect(await listClassRoster(sb, 'c')).toEqual([]);
  });

  it('throws on RPC error', async () => {
    const sb = makeSb(async () => ({ data: null, error: { message: 'NOT_CLASS_OWNER' } }));
    await expect(listClassRoster(sb, 'c')).rejects.toThrow('NOT_CLASS_OWNER');
  });
});
