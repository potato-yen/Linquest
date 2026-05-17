// lib/ui/composites/RosterTable.tsx
// Collapsible student roster as a table (select column | name | joined-at).
// Collapsed by default so the activity section stays reachable even with
// 20–50 students. The left select column scaffolds future bulk operations
// (e.g. remove student); selection state is local for now.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import { Pressable } from '../components/Pressable';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { color, space, radius } from '../tokens';
import type { ClassRosterRow } from '../../classes/types';

function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      style={[
        styles.checkbox,
        checked && { backgroundColor: color.brand.primary, borderColor: color.brand.primary },
      ]}
    >
      {checked ? <Icon name="check" size={16} color={color.text.onPrimary} /> : null}
    </View>
  );
}

export function RosterTable({ roster }: { roster: ClassRosterRow[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allSelected = roster.length > 0 && selected.size === roster.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(roster.map((r) => r.user_id)));
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={styles.header}
      >
        <Text variant="h3">學生名單（{roster.length}）</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={color.text.muted} />
      </Pressable>

      {open ? (
        roster.length === 0 ? (
          <EmptyState title="尚無學生" body="把班級代碼分享給學生，他們加入後會出現在這裡。" />
        ) : (
          <Card padding={0} style={{ marginTop: space[2], overflow: 'hidden' }}>
            <Pressable onPress={toggleAll} style={[styles.row, styles.headRow]}>
              <View style={styles.selCol}><Checkbox checked={allSelected} /></View>
              <Text variant="label" color="muted" style={styles.nameCol}>姓名</Text>
              <Text variant="label" color="muted">加入時間</Text>
            </Pressable>
            <Divider />
            {roster.map((r, i) => {
              const isSel = selected.has(r.user_id);
              return (
                <View key={r.user_id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => toggle(r.user_id)}
                    style={[styles.row, isSel && { backgroundColor: color.bg.muted }]}
                  >
                    <View style={styles.selCol}><Checkbox checked={isSel} /></View>
                    <Text style={styles.nameCol} numberOfLines={1}>
                      {r.display_name ?? r.user_id}
                    </Text>
                    <Text variant="label" color="muted">{formatJoinedAt(r.joined_at)}</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[3],
  },
  headRow: { backgroundColor: color.bg.muted },
  selCol: { width: 32 },
  nameCol: { flex: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.bg.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
