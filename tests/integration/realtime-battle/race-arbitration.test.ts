import { submitBattleAnswer } from '../../../lib/realtime-battle/service';
import { resetDb } from '../../setup/reset-db';
import {
  createAcceptedBattle,
  forceBattleQuestionWindow,
  getBattleRow,
  getQuestionAnswer,
  wrongChoiceFor,
} from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle race arbitration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('awards the point to the first correct answer and returns correct_late for the second', async () => {
    const { fixture, battleId } = await createAcceptedBattle();
    await forceBattleQuestionWindow(fixture, battleId);

    const correctAnswer = await getQuestionAnswer(fixture, battleId, 0);

    await expect(
      submitBattleAnswer(fixture.attackerSb, {
        battle_id: battleId,
        question_index: 0,
        choice: correctAnswer,
        response_ms: 420,
      }),
    ).resolves.toBe('correct_first');

    await expect(
      submitBattleAnswer(fixture.defenderSb, {
        battle_id: battleId,
        question_index: 0,
        choice: correctAnswer,
        response_ms: 610,
      }),
    ).resolves.toBe('correct_late');

    const battle = await getBattleRow(fixture, battleId);
    expect(battle.challenger_score).toBe(1);
    expect(battle.defender_score).toBe(0);
    expect(battle.current_index).toBe(1);

    const { count } = await fixture.svc
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('battle_id', battleId);
    expect(count).toBe(2);
  });

  it('advances the question with no score when both players lock themselves out', async () => {
    const { fixture, battleId } = await createAcceptedBattle();
    await forceBattleQuestionWindow(fixture, battleId);

    const correctAnswer = await getQuestionAnswer(fixture, battleId, 0);
    const wrongAnswer = wrongChoiceFor(correctAnswer);

    await expect(
      submitBattleAnswer(fixture.attackerSb, {
        battle_id: battleId,
        question_index: 0,
        choice: wrongAnswer,
        response_ms: 500,
      }),
    ).resolves.toBe('incorrect');

    await expect(
      submitBattleAnswer(fixture.defenderSb, {
        battle_id: battleId,
        question_index: 0,
        choice: wrongAnswer,
        response_ms: 700,
      }),
    ).resolves.toBe('incorrect');

    const battle = await getBattleRow(fixture, battleId);
    expect(battle.challenger_score).toBe(0);
    expect(battle.defender_score).toBe(0);
    expect(battle.current_index).toBe(1);
    expect(battle.challenger_locked).toContain(0);
    expect(battle.defender_locked).toContain(0);
  });
});
