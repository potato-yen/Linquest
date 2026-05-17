// app/(app)/console/class/[classId]/new.tsx
// Task 5 — Teacher Console: Create Activity with pasted CSV
import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScreenScaffold,
  Text,
  Button,
  Card,
  Input,
  SectionHeader,
} from '../../../../../lib/ui/components';
import { space, color, radius } from '../../../../../lib/ui/tokens';
import { getSupabaseClient } from '../../../../../lib/supabase';
import { createActivityWithCustomBank } from '../../../../../lib/teacher-console/service';
import { previewCsv } from '../../../../../lib/teacher-console-ui/csv-preview';
import { endsAtFromDuration } from '../../../../../lib/teacher-console-ui/ends-at';
import { mapError } from '../../../../../lib/ui/error/mapError';

// ─── Inline Stepper ──────────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Button
        title="－"
        variant="ghost"
        onPress={() => onChange(Math.max(min, value - step))}
      />
      <Text variant="h3">{value}</Text>
      <Button
        title="＋"
        variant="ghost"
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const REFRESH_CHOICES = [6, 8, 12, 24] as const;
type RefreshInterval = 6 | 8 | 12 | 24;

export default function NewActivityScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const sb = getSupabaseClient();

  const [name, setName] = useState('');
  const [days, setDays] = useState('7');
  const [csvText, setCsvText] = useState('');
  const [groupCount, setGroupCount] = useState(4);
  const [mapSize, setMapSize] = useState(80);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(12);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const preview = useMemo(() => previewCsv(csvText), [csvText]);

  const daysNum = Number(days);
  const canSubmit =
    !!name.trim() &&
    preview.ok &&
    Number.isFinite(daysNum) &&
    daysNum >= 1 &&
    !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const ends_at = endsAtFromDuration({ days: daysNum, hours: 0 });
      if (!preview.ok) return; // type guard; already checked above

      const rows = preview.rows.map((r) => ({
        prompt: r.prompt,
        correct_answer: r.correct_answer,
        distractors: r.distractors as [string, string, string],
        meta: {
          difficulty: (r.meta.difficulty === 'advanced' ? 'advanced' : 'standard') as
            | 'advanced'
            | 'standard',
        },
      }));

      const id = await createActivityWithCustomBank(sb, {
        class_id: classId,
        name: name.trim(),
        ends_at,
        group_count: groupCount,
        map_size_target: mapSize,
        refresh_interval_hours: refreshInterval,
        bank_name: `${name.trim()} 題庫`,
        rows,
      });

      router.replace(`/console/activity/${id}`);
    } catch (e) {
      setSubmitError(mapError(e).message);
      setBusy(false);
    }
  }

  return (
    <ScreenScaffold scroll>
      {/* Back / cancel */}
      <View>
        <Button title="← 取消" variant="ghost" onPress={() => router.back()} />
      </View>

      <Text variant="h1">開新活動</Text>

      {/* Activity name */}
      <SectionHeader title="活動名稱" />
      <Input
        label="名稱"
        placeholder="例：第三單元期中複習"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
      />

      {/* Duration */}
      <SectionHeader title="結束時間" />
      <Input
        label="幾天後結束"
        placeholder="7"
        value={days}
        onChangeText={setDays}
        keyboardType="number-pad"
      />

      {/* CSV paste */}
      <SectionHeader title="題庫 CSV" />
      <Input
        label="貼上 CSV 內容"
        placeholder={
          'prompt,correct_answer,distractor_1,distractor_2,distractor_3\n蘋果,apple,orange,banana,grape'
        }
        value={csvText}
        onChangeText={setCsvText}
        multiline
        numberOfLines={6}
        style={styles.csvInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {csvText.trim().length > 0 && (
        <View style={styles.previewRow}>
          {preview.ok ? (
            <Text variant="caption" color="brand">
              ✓ 已解析 {preview.count} 題
            </Text>
          ) : (
            <Text variant="caption" color="warm">
              {preview.message}
            </Text>
          )}
        </View>
      )}

      {/* Group count stepper */}
      <SectionHeader title="分組數（2–10）" />
      <Stepper
        value={groupCount}
        min={2}
        max={10}
        onChange={setGroupCount}
      />

      {/* Map size stepper */}
      <SectionHeader title="地圖大小（50–120）" />
      <Stepper
        value={mapSize}
        min={50}
        max={120}
        step={10}
        onChange={setMapSize}
      />

      {/* Refresh interval buttons */}
      <SectionHeader title="刷新週期" />
      <View style={styles.refreshRow}>
        {REFRESH_CHOICES.map((h) => (
          <View key={h} style={styles.refreshBtn}>
            <Button
              title={`${h}h`}
              variant={refreshInterval === h ? 'primary' : 'ghost'}
              onPress={() => setRefreshInterval(h)}
            />
          </View>
        ))}
      </View>

      {/* Error */}
      {submitError ? (
        <Text variant="caption" color="warm">
          {submitError}
        </Text>
      ) : null}

      {/* Submit */}
      <View style={{ marginTop: space[3] }}>
        <Button
          title={busy ? '建立中…' : '建立活動'}
          loading={busy}
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  csvInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewRow: {
    marginTop: space[1],
  },
  refreshRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  refreshBtn: {
    flex: 1,
  },
});
