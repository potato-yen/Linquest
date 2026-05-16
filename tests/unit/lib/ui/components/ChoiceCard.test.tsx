// tests/unit/lib/ui/components/ChoiceCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChoiceCard } from '../../../../../lib/ui/components/ChoiceCard';

describe('ChoiceCard', () => {
  it('renders A/B/C/D label and choice text', () => {
    const { getByText } = render(<ChoiceCard pick="A" choice="serenity" state="idle" onPress={() => {}} />);
    expect(getByText('A')).toBeTruthy();
    expect(getByText('serenity')).toBeTruthy();
  });

  it('calls onPress when state=idle', () => {
    const fn = jest.fn();
    const { getByText } = render(<ChoiceCard pick="B" choice="chaos" state="idle" onPress={fn} />);
    fireEvent.press(getByText('chaos'));
    expect(fn).toHaveBeenCalled();
  });

  it('does not call onPress when state=correct/incorrect (locked)', () => {
    const fn = jest.fn();
    const { getByText } = render(<ChoiceCard pick="B" choice="chaos" state="incorrect" onPress={fn} />);
    fireEvent.press(getByText('chaos'));
    expect(fn).not.toHaveBeenCalled();
  });
});
