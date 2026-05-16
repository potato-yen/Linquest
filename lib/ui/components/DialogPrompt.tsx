import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { color, radius, space } from '../tokens';

export function DialogPrompt({
  visible, title, body, confirmLabel = '確認', cancelLabel = '取消', destructive,
  onConfirm, onCancel,
}: {
  visible: boolean; title: string; body?: string;
  confirmLabel?: string; cancelLabel?: string; destructive?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text variant="h3">{title}</Text>
          {body ? <Text color="muted" style={{ marginTop: space[2] }}>{body}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[5] }}>
            <View style={{ flex: 1 }}><Button title={cancelLabel} variant="ghost" onPress={onCancel} /></View>
            <View style={{ flex: 1 }}><Button title={confirmLabel} variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm} /></View>
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
