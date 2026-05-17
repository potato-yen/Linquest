import { listClassRoster } from '../../../lib/classes/service';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('listClassRoster (wrapper vs pushed RPC)', () => {
  it('placeholder — requires SUPABASE_INTEGRATION_TESTS=1', () => {
    expect(true).toBe(true);
  });
});
