import { deleteClass } from '../../../../lib/classes/service';

function makeSb(rpcImpl: any) {
  return { rpc: jest.fn(rpcImpl) } as any;
}

describe('deleteClass', () => {
  it('calls delete_class via RPC so server-side cleanup can run', async () => {
    const sb = makeSb(async () => ({ data: null, error: null }));
    await deleteClass(sb, 'class-1');
    expect(sb.rpc).toHaveBeenCalledWith('delete_class', { p_class_id: 'class-1' });
  });

  it('throws on RPC error', async () => {
    const sb = makeSb(async () => ({ data: null, error: { message: 'NOT_CLASS_OWNER' } }));
    await expect(deleteClass(sb, 'class-1')).rejects.toThrow('NOT_CLASS_OWNER');
  });
});
