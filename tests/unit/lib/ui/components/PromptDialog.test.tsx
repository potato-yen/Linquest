import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PromptDialog } from '../../../../../lib/ui/components/PromptDialog';

const base = {
  visible: true,
  title: '修改名稱',
  initialValue: '小明',
  onCancel: jest.fn(),
};

describe('PromptDialog', () => {
  it('prefills the current value', () => {
    const { getByDisplayValue } = render(<PromptDialog {...base} onConfirm={jest.fn()} />);
    getByDisplayValue('小明');
  });

  it('disables confirm when blank or unchanged, enables on a real change', () => {
    const onConfirm = jest.fn();
    const { getByDisplayValue, getByText } = render(<PromptDialog {...base} onConfirm={onConfirm} />);
    // Unchanged → confirm is a no-op.
    fireEvent.press(getByText('儲存'));
    expect(onConfirm).not.toHaveBeenCalled();
    // Whitespace-only → still a no-op.
    fireEvent.changeText(getByDisplayValue('小明'), '   ');
    fireEvent.press(getByText('儲存'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms with the trimmed value', () => {
    const onConfirm = jest.fn();
    const { getByDisplayValue, getByText } = render(<PromptDialog {...base} onConfirm={onConfirm} />);
    fireEvent.changeText(getByDisplayValue('小明'), '  小華  ');
    fireEvent.press(getByText('儲存'));
    expect(onConfirm).toHaveBeenCalledWith('小華');
  });

  it('cancel fires onCancel', () => {
    const onCancel = jest.fn();
    const { getByText } = render(<PromptDialog {...base} onCancel={onCancel} onConfirm={jest.fn()} />);
    fireEvent.press(getByText('取消'));
    expect(onCancel).toHaveBeenCalled();
  });
});
