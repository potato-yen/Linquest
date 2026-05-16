// tests/unit/lib/ui/components/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../../../../lib/ui/components/Button';

describe('Button', () => {
  it('calls onPress when not loading and not disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Go" onPress={onPress} />);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<Button title="Go" loading onPress={onPress} accessibilityLabel="go-btn" />);
    fireEvent.press(getByLabelText('go-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Go" disabled onPress={onPress} />);
    fireEvent.press(getByText('Go'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
