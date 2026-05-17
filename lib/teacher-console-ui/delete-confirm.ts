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
