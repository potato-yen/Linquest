import { resetDb } from '../../setup/reset-db';
import {
  createAcceptedBattle,
  forceBattleQuestionWindow,
  getBattleRow,
} from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle per-question timeout', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('advances expired questions to the next index and re-arms the timer', async () => {
    const { fixture, battleId } = await createAcceptedBattle();
    await forceBattleQuestionWindow(fixture, battleId, {
      revealOffsetMs: -5_000,
      deadlineOffsetMs: -1_000,
      currentIndex: 0,
      currentIndexDecided: false,
    });

    const { data, error } = await fixture.svc.rpc('expire_battle_questions');
    expect(error).toBeNull();
    expect(data).toBe(1);

    const battle = await getBattleRow(fixture, battleId);
    expect(battle.current_index).toBe(1);
    expect(battle.current_index_decided).toBe(false);
    expect(new Date(battle.question_deadline_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('does not advance a question whose deadline is already in the future', async () => {
    const { fixture, battleId } = await createAcceptedBattle();
    await forceBattleQuestionWindow(fixture, battleId, {
      revealOffsetMs: -5_000,
      deadlineOffsetMs: 60_000,
      currentIndex: 0,
      currentIndexDecided: false,
    });

    const { data, error } = await fixture.svc.rpc('expire_battle_questions');
    expect(error).toBeNull();
    expect(data).toBe(0);

    const battle = await getBattleRow(fixture, battleId);
    expect(battle.current_index).toBe(0);
  });
});
