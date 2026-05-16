// tests/unit/lib/ui/components/Input.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../../../../lib/ui/components/Input';

describe('Input', () => {
  it('renders label and helper', () => {
    const { getByText } = render(<Input label="Email" helper="必填" value="" onChangeText={() => {}} />);
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('必填')).toBeTruthy();
  });

  it('shows error in place of helper when error provided', () => {
    const { getByText, queryByText } = render(<Input label="Email" helper="必填" error="格式錯誤" value="" onChangeText={() => {}} />);
    expect(getByText('格式錯誤')).toBeTruthy();
    expect(queryByText('必填')).toBeNull();
  });

  it('forwards onChangeText', () => {
    const onChange = jest.fn();
    const { getByDisplayValue } = render(<Input label="Email" value="abc" onChangeText={onChange} />);
    fireEvent.changeText(getByDisplayValue('abc'), 'def');
    expect(onChange).toHaveBeenCalledWith('def');
  });
});
