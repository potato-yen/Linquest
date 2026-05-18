import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TodayTaskCard } from '../../../../../lib/ui/composites/HomeCards';

describe('TodayTaskCard', () => {
  it('shows the next-stage label and is a tappable shortcut (no fake progress)', () => {
    const onPress = jest.fn();
    const { getByText, queryByText, getByLabelText } = render(
      <TodayTaskCard stageLabel="Stage 6" onPress={onPress} />
    );
    getByText('下一關');
    getByText('Stage 6');
    // The misleading "0 / 1" fraction must be gone.
    expect(queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
    fireEvent.press(getByLabelText('today-task'));
    expect(onPress).toHaveBeenCalled();
  });
});
