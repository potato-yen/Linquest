import { Question } from './types';

export function buildChoiceOrder(
  question: Pick<Question, 'correct_answer' | 'distractors'>,
  rng: () => number = Math.random,
): string[] {
  const choices = [question.correct_answer, ...question.distractors];

  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
  }

  return choices;
}
