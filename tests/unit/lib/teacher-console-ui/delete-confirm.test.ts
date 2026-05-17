import { deleteConfirmPlan } from '../../../../lib/teacher-console-ui/delete-confirm';

describe('deleteConfirmPlan', () => {
  it('single-step for ended', () => {
    expect(deleteConfirmPlan('ended').tier).toBe('single');
  });
  it('double-step for draft and active', () => {
    expect(deleteConfirmPlan('draft').tier).toBe('double');
    expect(deleteConfirmPlan('active').tier).toBe('double');
  });
  it('provides warning copy for the not-ended case', () => {
    expect(deleteConfirmPlan('active').firstWarning).toContain('尚未結束');
  });
});
