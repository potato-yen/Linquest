// tests/unit/lib/ui/components/RoadmapTrail.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoadmapTrail } from '../../../../../lib/ui/components/RoadmapTrail';

describe('RoadmapTrail', () => {
  it('fires onPressStage with the tapped stage number', () => {
    const fn = jest.fn();
    const { getByLabelText } = render(
      <RoadmapTrail lastStage={5} currentStage={2} width={320} height={500} onPressStage={fn} />
    );
    fireEvent.press(getByLabelText('stage-3'));
    expect(fn).toHaveBeenCalledWith(3);
  });
});
