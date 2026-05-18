import { classDeleteConfirmPlan } from '../../../../lib/teacher-console-ui/delete-confirm';

describe('classDeleteConfirmPlan', () => {
  it('single-step when there are no activities', () => {
    expect(classDeleteConfirmPlan([]).tier).toBe('single');
  });
  it('single-step when every activity is ended', () => {
    expect(classDeleteConfirmPlan(['ended', 'ended']).tier).toBe('single');
  });
  it('double-step when any activity is draft or active', () => {
    expect(classDeleteConfirmPlan(['ended', 'draft']).tier).toBe('double');
    expect(classDeleteConfirmPlan(['active']).tier).toBe('double');
  });
  it('counts the live activities in the warning copy', () => {
    const plan = classDeleteConfirmPlan(['active', 'draft', 'ended']);
    expect(plan.firstWarning).toContain('2');
    expect(plan.firstWarning).toContain('未結束');
  });
});
