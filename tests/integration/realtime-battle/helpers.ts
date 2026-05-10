import { acceptBattleInvite, sendBattleInvite } from '../../../lib/realtime-battle/service';
import { TwoGroupFixture, setupTwoGroupFixture } from '../territory/fixtures';

export interface AcceptedBattleFixture {
  fixture: TwoGroupFixture;
  tileId: string;
  battleId: string;
}

export async function createAcceptedBattle(): Promise<AcceptedBattleFixture> {
  const fixture = await setupTwoGroupFixture();
  const tile = await fixture.makeAdjacentSpecialTileForAttacker();
  const battleId = await sendBattleInvite(fixture.attackerSb, {
    activity_id: fixture.activity_id,
    tile_id: tile.id,
    defender_user_id: fixture.defenderUserId,
  });

  await acceptBattleInvite(fixture.defenderSb, battleId);

  return {
    fixture,
    tileId: tile.id,
    battleId,
  };
}

export async function forceBattleQuestionWindow(
  fixture: TwoGroupFixture,
  battleId: string,
  options?: {
    revealOffsetMs?: number;
    deadlineOffsetMs?: number;
    currentIndex?: number;
    currentIndexDecided?: boolean;
  },
): Promise<void> {
  const revealOffsetMs = options?.revealOffsetMs ?? -1_000;
  const deadlineOffsetMs = options?.deadlineOffsetMs ?? 30_000;

  const update: Record<string, unknown> = {
    reveal_at: new Date(Date.now() + revealOffsetMs).toISOString(),
    question_deadline_at: new Date(Date.now() + deadlineOffsetMs).toISOString(),
  };

  if (options?.currentIndex !== undefined) {
    update.current_index = options.currentIndex;
  }

  if (options?.currentIndexDecided !== undefined) {
    update.current_index_decided = options.currentIndexDecided;
  }

  const { error } = await fixture.svc.from('battles').update(update).eq('id', battleId);
  if (error) {
    throw error;
  }
}

export async function getBattleRow(fixture: TwoGroupFixture, battleId: string) {
  const { data, error } = await fixture.svc.from('battles').select('*').eq('id', battleId).single();
  if (error || !data) {
    throw error ?? new Error(`battle ${battleId} not found`);
  }
  return data;
}

export async function getQuestionAnswer(
  fixture: TwoGroupFixture,
  battleId: string,
  questionIndex: number,
): Promise<string> {
  const battle = await getBattleRow(fixture, battleId);
  const questionId = battle.question_ids[questionIndex];

  const { data, error } = await fixture.svc
    .from('questions')
    .select('correct_answer')
    .eq('id', questionId)
    .single();

  if (error || !data) {
    throw error ?? new Error(`question ${questionId} not found`);
  }

  return data.correct_answer as string;
}

export function wrongChoiceFor(correctAnswer: string): string {
  return `wrong:${correctAnswer}`;
}
