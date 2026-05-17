import { activityScreenState } from '../../../../lib/teacher-console-ui/activity-screen-state';

describe('activityScreenState', () => {
  it('maps status verbatim to the three states', () => {
    expect(activityScreenState('draft')).toBe('draft');
    expect(activityScreenState('active')).toBe('active');
    expect(activityScreenState('ended')).toBe('ended');
  });
});
