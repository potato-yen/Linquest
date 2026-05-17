import { deleteConfirmPlan } from '../../../../lib/teacher-console-ui/delete-confirm';

it('draft/active require extra warning before final', () => {
  for (const s of ['draft', 'active'] as const) {
    const p = deleteConfirmPlan(s);
    expect(p.tier).toBe('double');
    expect(p.firstWarning && p.firstWarning.length).toBeGreaterThan(0);
  }
});
it('ended goes straight to final', () => {
  const p = deleteConfirmPlan('ended');
  expect(p.tier).toBe('single');
  expect(p.firstWarning).toBeUndefined();
});
