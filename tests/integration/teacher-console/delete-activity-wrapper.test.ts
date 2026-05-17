import { deleteActivity } from '../../../lib/teacher-console/service';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('deleteActivity (wrapper)', () => {
  it('placeholder — requires SUPABASE_INTEGRATION_TESTS=1', () => {
    expect(true).toBe(true);
  });
});
