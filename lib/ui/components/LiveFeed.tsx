import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Badge } from './Badge';
import { TeacherConsoleLiveEvent } from '../../teacher-console/types';
import { space, color, radius } from '../tokens';

export function LiveFeed({ events }: { events: TeacherConsoleLiveEvent[] }) {
  if (events.length === 0) {
    return (
      <Card style={styles.empty}>
        <Text color="muted">尚無即時動態</Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: event.group_color || color.bg.muted }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text variant="label" color="muted">
                {new Date(event.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
              <Text variant="label" style={{ fontWeight: '600' }} color={event.group_color ? 'default' : 'muted'}>
                {event.group_name || '系統'}
              </Text>
            </View>
            <Text style={styles.content}>
              <Text style={{ fontWeight: '600' }}>{event.user_display_name || '系統'}</Text>
              {' '}
              {formatEvent(event)}
            </Text>
          </View>
          {event.score_delta !== 0 && (
            <Badge variant={event.score_delta > 0 ? 'primary' : 'destructive'}>
              {event.score_delta > 0 ? `+${event.score_delta}` : event.score_delta}
            </Badge>
          )}
        </View>
      ))}
    </View>
  );
}

function formatEvent(event: TeacherConsoleLiveEvent): string {
  switch (event.event_type) {
    case 'capture':
      return `佔領了 ${event.payload.kind === 'special' ? '特殊地塊' : '地塊'}`;
    case 'challenge_cost':
      return event.payload.refund ? '獲得了挑戰退款' : '支付了挑戰費用';
    case 'reverse_attack_win':
      return '反擊成功';
    case 'reverse_attack_fail':
      return '反擊失敗';
    case 'multiplier_self_recapture':
      return '重新奪回倍率地塊';
    case 'refresh_buff_applied':
      return '獲得了補給增益';
    case 'refresh_buff_expired':
      return '補給增益已過期';
    case 'tax_tick':
      return '繳納了稅金';
    default:
      return event.event_type;
  }
}

const styles = StyleSheet.create({
  container: { gap: space[2] },
  empty: { padding: space[4], alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    backgroundColor: color.bg.surface,
    padding: space[3],
    borderRadius: radius.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  content: { fontSize: 14, lineHeight: 20 },
});
