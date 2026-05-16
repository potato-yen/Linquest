// lib/ui/components/Input.tsx
import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { color, radius, space, type as typeTokens } from '../tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
}

export function Input({ label, helper, error, style, ...rest }: InputProps) {
  return (
    <View style={{ gap: space[1] }}>
      {label ? <Text variant="label" color="secondary">{label}</Text> : null}
      <TextInput
        {...rest}
        placeholderTextColor={color.text.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? (
        <Text variant="caption" color="warm">{error}</Text>
      ) : helper ? (
        <Text variant="caption" color="muted">{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: color.bg.muted,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    color: color.text.primary,
    ...typeTokens.body,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: { borderColor: color.accent.warm },
});
