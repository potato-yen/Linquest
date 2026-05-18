// lib/ui/components/PromptDialog.tsx
// A single-text-input modal (e.g. edit display name). Confirm is disabled
// until the trimmed value is non-empty AND differs from the initial value.
// DialogPrompt stays confirm/cancel-only — this is the input-bearing sibling.
import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Input } from './Input';
import { Button } from './Button';
import { color, radius, space } from '../tokens';

export function PromptDialog({
  visible, title, initialValue, label, placeholder,
  confirmLabel = '儲存', cancelLabel = '取消', busy, error,
  onConfirm, onCancel,
}: {
  visible: boolean;
  title: string;
  initialValue: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  // Reset the field whenever the dialog (re)opens or the source value changes.
  useEffect(() => { if (visible) setValue(initialValue); }, [visible, initialValue]);

  const trimmed = value.trim();
  const canConfirm = !busy && trimmed.length > 0 && trimmed !== initialValue.trim();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text variant="h3">{title}</Text>
          <View style={{ marginTop: space[4] }}>
            <Input
              label={label}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              autoFocus
              error={error ?? undefined}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[5] }}>
            <View style={{ flex: 1 }}>
              <Button title={cancelLabel} variant="ghost" onPress={onCancel} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={confirmLabel}
                onPress={() => onConfirm(trimmed)}
                disabled={!canConfirm}
                loading={busy}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,62,31,0.4)', alignItems: 'center', justifyContent: 'center', padding: space[5] },
  card: { backgroundColor: color.bg.surface, borderRadius: radius.lg, padding: space[5], width: '100%', maxWidth: 360 },
});
