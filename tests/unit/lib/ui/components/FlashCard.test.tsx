import React from 'react';
import { render } from '@testing-library/react-native';
import { FlashCard } from '../../../../../lib/ui/components/FlashCard';
import { Question } from '../../../../../lib/answering/types';

const question: Question = {
  id: 'q1',
  prompt: '蘋果',
  correct_answer: 'apple',
  distractors: ['banana', 'orange', 'pear'],
  meta: {
    ipa: '/ˈapəl/',
    example_sentence: 'I ate an apple.',
    example_translation: '我吃了一顆蘋果。',
  },
};

describe('FlashCard', () => {
  it('renders the answer, IPA, and example content', () => {
    const { getByText } = render(<FlashCard question={question} isCorrect />);

    expect(getByText('答對了')).toBeTruthy();
    expect(getByText('apple')).toBeTruthy();
    expect(getByText('/ˈapəl/')).toBeTruthy();
    expect(getByText('I ate an apple.')).toBeTruthy();
    expect(getByText('我吃了一顆蘋果。')).toBeTruthy();
  });

  it('shows prompt fallback when no example sentence exists', () => {
    const { getByText } = render(
      <FlashCard
        question={{ ...question, meta: {} }}
        isCorrect={false}
      />,
    );

    expect(getByText('再看一次')).toBeTruthy();
    expect(getByText('意思')).toBeTruthy();
    expect(getByText('蘋果')).toBeTruthy();
  });

  it('uses preview wording and shows prompt in showBoth mode', () => {
    const { getByText } = render(<FlashCard question={question} showBoth />);

    expect(getByText('單字預覽')).toBeTruthy();
    expect(getByText('蘋果')).toBeTruthy();
  });
});
