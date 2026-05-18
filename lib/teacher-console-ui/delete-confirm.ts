import { ActivityStatus } from '../territory/types';

export interface DeleteConfirmPlan {
  tier: 'single' | 'double';
  firstWarning?: string;
  finalTitle: string;
  finalBody: string;
}

export function deleteConfirmPlan(status: ActivityStatus): DeleteConfirmPlan {
  const finalTitle = '永久刪除此活動？';
  const finalBody = '將永久刪除本活動所有內容（含上傳題庫、地圖、分數），無法復原。';
  if (status === 'ended') {
    return { tier: 'single', finalTitle, finalBody };
  }
  return {
    tier: 'double',
    firstWarning: '此活動尚未結束（學生可能仍在遊玩，或設定尚未發布）。確定要刪除？',
    finalTitle,
    finalBody,
  };
}

// Deleting a class cascades to its activities / maps / groups / roster.
// Tier up to a double-confirm when any activity is still live (not ended),
// mirroring deleteConfirmPlan's draft/active handling.
export function classDeleteConfirmPlan(
  activityStatuses: ActivityStatus[],
): DeleteConfirmPlan {
  const finalTitle = '永久刪除此班級？';
  const finalBody =
    '將永久刪除本班級所有活動、地圖、分組與學生加入紀錄，無法復原。';
  const liveCount = activityStatuses.filter((s) => s !== 'ended').length;
  if (liveCount === 0) {
    return { tier: 'single', finalTitle, finalBody };
  }
  return {
    tier: 'double',
    firstWarning: `此班級尚有 ${liveCount} 個未結束的活動（學生可能仍在遊玩）。確定要刪除整個班級？`,
    finalTitle,
    finalBody,
  };
}
