// app/(app)/console/class/[classId]/new.tsx
// Task 5 — Teacher Console: Create Activity (CSV file import or paste)
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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

  async function handleImportFile() {
    setImportError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const text =
        Platform.OS === 'web'
          ? await (await fetch(asset.uri)).text()
          : await new File(asset.uri).text();
      setCsvText(text);
      setFileName(asset.name);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '檔案讀取失敗');
    }
  }

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
        meta: r.meta,
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
      <Text variant="caption" color="muted">
        欄位：中文,英文,詞性（詞性可留空）。誘答會自動從其他題的英文答案隨機抽，不需自己出。至少 4 個不重複的英文答案。
      </Text>
      <View style={{ marginTop: space[2] }}>
        <Button title="選擇 CSV 檔" variant="ghost" onPress={handleImportFile} />
      </View>
      {fileName ? (
        <Text variant="caption" color="brand">已匯入：{fileName}（仍可在下方編輯）</Text>
      ) : null}
      {importError ? (
        <Text variant="caption" color="warm">{importError}</Text>
      ) : null}
      <Input
        label="或直接貼上 CSV 內容"
        placeholder={'中文,英文,詞性\n蘋果,apple,n.\n跑,run,v.\n快樂的,happy,adj.\n書,book,n.'}
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
