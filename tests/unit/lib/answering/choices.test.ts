import { buildChoiceOrder } from '../../../../lib/answering/choices';
import { Question } from '../../../../lib/answering/types';

const question: Question = {
  id: 'q1',
  prompt: '中文',
  correct_answer: 'correct',
  distractors: ['d1', 'd2', 'd3'],
};

describe('buildChoiceOrder', () => {
  it('returns all four unique choices', () => {
    const choices = buildChoiceOrder(question, () => 0.75);
    expect(new Set(choices)).toEqual(new Set(['correct', 'd1', 'd2', 'd3']));
    expect(choices).toHaveLength(4);
  });

  it('does not keep the correct answer fixed in the first slot', () => {
    const choices = buildChoiceOrder(question, () => 0);
    expect(choices[0]).not.toBe('correct');
  });
});
