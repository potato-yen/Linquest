// tests/unit/lib/ui/components/Text.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '../../../../../lib/ui/components/Text';
import { type as typeTokens } from '../../../../../lib/ui/tokens';

describe('Text', () => {
  it('renders children with body variant by default', () => {
    const { getByText } = render(<Text>hello</Text>);
    const node = getByText('hello');
    expect(node.props.style).toEqual(expect.objectContaining({ fontSize: typeTokens.body.fontSize }));
  });

  it('honours variant=h1', () => {
    const { getByText } = render(<Text variant="h1">title</Text>);
    expect(getByText('title').props.style).toEqual(expect.objectContaining({ fontSize: 28 }));
  });

  it('honours color override', () => {
    const { getByText } = render(<Text color="muted">x</Text>);
    expect(getByText('x').props.style).toEqual(expect.objectContaining({ color: '#8A8270' }));
  });
});
