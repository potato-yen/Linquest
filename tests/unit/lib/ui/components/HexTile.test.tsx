import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import { HexTile } from '../../../../../lib/ui/components/HexTile';

const props = {
  cx: 100, cy: 100, tileId: 't1', render: {
    ownership: 'self' as const, isCapital: false, isMultiplier: false,
    multiplier: null, isSpecial: false, isCooldown: false, hasActiveChallenge: false,
    ownerGroupId: 'g1',
  },
  groupColor: '#5A7E3A',
};

describe('HexTile', () => {
  it('renders polygon with self treatment (thick dark stroke)', () => {
    const { UNSAFE_getAllByType } = render(<Svg><HexTile {...props} /></Svg>);
    const polygons = UNSAFE_getAllByType(require('react-native-svg').Polygon);
    expect(polygons.length).toBeGreaterThanOrEqual(1);
    expect(polygons[0].props.stroke).toBe('#2C3E1F');
    expect(polygons[0].props.strokeWidth).toBe(2);
  });

  it('renders other-group with thin same-color stroke', () => {
    const { UNSAFE_getAllByType } = render(
      <Svg><HexTile {...props} render={{ ...props.render, ownership: 'other' }} groupColor="#7E3A5A" /></Svg>
    );
    const polygons = UNSAFE_getAllByType(require('react-native-svg').Polygon);
    expect(polygons[0].props.stroke).toBe('#7E3A5A');
    expect(polygons[0].props.strokeWidth).toBe(1);
  });

  it('fires onPress with the tileId', () => {
    const fn = jest.fn();
    const { UNSAFE_getAllByType } = render(<Svg><HexTile {...props} onPress={fn} /></Svg>);
    const polygons = UNSAFE_getAllByType(require('react-native-svg').Polygon);
    fireEvent(polygons[0], 'press');
    expect(fn).toHaveBeenCalledWith('t1');
  });
});
