import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Badge } from './Badge';
import { TeacherConsoleStudentStat } from '../../teacher-console/types';
import { space, color, radius } from '../tokens';

export function StudentStatsTable({ stats }: { stats: TeacherConsoleStudentStat[] }) {
  if (stats.length === 0) {
    return (
      <Card style={styles.empty}>
        <Text color="muted">尚無學生數據</Text>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={styles.headerRow}>
        <Text variant="label" style={[styles.cell, { flex: 2 }]}>學生</Text>
        <Text variant="label" style={[styles.cell, { flex: 1, textAlign: 'center' }]}>正確率</Text>
        <Text variant="label" style={[styles.cell, { flex: 1, textAlign: 'center' }]}>總題數</Text>
      </View>
      {stats.map((stat) => (
        <View key={stat.user_id} style={styles.row}>
          <View style={[styles.cell, { flex: 2 }]}>
            <Text style={{ fontWeight: '500' }}>{stat.display_name}</Text>
            {stat.group_name && (
              <Text variant="label" color="muted" style={{ color: stat.group_color || color.text.muted }}>
                {stat.group_name}
              </Text>
            )}
          </View>
          <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
            <Badge variant={getAccuracyVariant(stat.accuracy)}>
              {(stat.accuracy * 100).toFixed(0)}%
            </Badge>
          </View>
          <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{stat.total_attempts}</Text>
        </View>
      ))}
    </Card>
  );
}

function getAccuracyVariant(accuracy: number): 'primary' | 'destructive' | 'warm' {
  if (accuracy >= 0.8) return 'primary';
  if (accuracy >= 0.6) return 'warm';
  return 'destructive';
}

const styles = StyleSheet.create({
  empty: { padding: space[4], alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: color.bg.muted,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
  },
  row: {
    flexDirection: 'row',
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderTopWidth: 1,
    borderTopColor: color.bg.sunken,
    alignItems: 'center',
  },
  cell: { paddingHorizontal: space[1] },
});
