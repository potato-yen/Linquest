import { ActivityStatus } from '../territory/types';

export type ActivityScreen = 'draft' | 'active' | 'ended';

export function activityScreenState(status: ActivityStatus): ActivityScreen {
  return status;
}
