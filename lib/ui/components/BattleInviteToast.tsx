import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { Countdown } from './Countdown';
import { color, radius, space } from '../tokens';

export function BattleInviteToast({
  visible,
  challengerName,
  challengerColor,
  deadline,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  challengerName: string;
  challengerColor: string;
  deadline: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text variant="caption" color="muted">收到挑戰</Text>
          <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center', marginTop: space[2] }}>
            <Avatar name={challengerName} tint={challengerColor} size="lg" />
            <View style={{ flex: 1 }}>
              <Text variant="h3">{challengerName}</Text>
              <Text color="muted">想跟你 1v1 對戰</Text>
            </View>
          </View>
          <View style={{ marginTop: space[3], alignItems: 'center' }}>
            <Text variant="caption" color="muted">等待回應</Text>
            <Countdown deadline={deadline} />
          </View>
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[5] }}>
            <View style={{ flex: 1 }}><Button title="拒絕" variant="ghost" onPress={onDecline} /></View>
            <View style={{ flex: 1 }}><Button title="接受" onPress={onAccept} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,62,31,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[5],
  },
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.lg,
    padding: space[5],
    width: '100%',
    maxWidth: 360,
  },
});
