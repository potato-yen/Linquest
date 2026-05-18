import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScreenScaffold,
  Text,
  Skeleton,
  ErrorState,
  Card,
  Button,
  DialogPrompt,
  SectionHeader,
  SettlementBoard,
} from '../../../../lib/ui/components';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../../lib/supabase';
import {
  listMyActivities,
  getActivityDashboard,
  getActivitySettlement,
  publishActivity,
  endActivityNow,
  deleteActivity,
} from '../../../../lib/teacher-console/service';
import { activityScreenState, deleteConfirmPlan } from '../../../../lib/teacher-console-ui';
import { teacherConsoleErrorMessage } from '../../../../lib/teacher-console/errors';
import { mapError } from '../../../../lib/ui/error/mapError';
import { space } from '../../../../lib/ui/tokens';

type DraftData = {
  screen: 'draft';
  summary: Awaited<ReturnType<typeof listMyActivities>>[number];
};

type ActiveData = {
  screen: 'active';
  summary: Awaited<ReturnType<typeof listMyActivities>>[number];
  dashboard: Awaited<ReturnType<typeof getActivityDashboard>>;
};

type EndedData = {
  screen: 'ended';
  summary: Awaited<ReturnType<typeof listMyActivities>>[number];
  settlement: Awaited<ReturnType<typeof getActivitySettlement>>;
};

type ActivityDetailData = DraftData | ActiveData | EndedData;

export default function ActivityDetail() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const sb = getSupabaseClient();
  const [dialog, setDialog] = useState<null | 'publish' | 'end'>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [delStep, setDelStep] = useState<0 | 1 | 2>(0);

  const { state, refresh } = useScreenData<ActivityDetailData>(
    async (_signal) => {
      const list = await listMyActivities(sb);
      const summary = list.find((a) => a.id === activityId);
      if (!summary) return null;
      const screen = activityScreenState(summary.status);
      if (screen === 'draft') return { screen, summary } as const;
      if (screen === 'active') {
        const dashboard = await getActivityDashboard(sb, activityId!);
        return { screen, summary, dashboard } as const;
      }
      const settlement = await getActivitySettlement(sb, activityId!);
      return { screen, summary, settlement } as const;
    },
    [activityId],
    { pollMs: 5000 },
  );

  async function onPublish() {
    setBusy(true);
    try {
      await publishActivity(sb, activityId!);
      setDialog(null);
      refresh();
    } catch (e) {
      setDialog(null);
      setMsg(teacherConsoleErrorMessage(e) ?? mapError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function onEnd() {
    setBusy(true);
    try {
      await endActivityNow(sb, activityId!);
      setDialog(null);
      refresh();
    } catch (e) {
      setDialog(null);
      setMsg(teacherConsoleErrorMessage(e) ?? mapError(e).message);
    } finally {
      setBusy(false);
    }
  }

  if (state.status === 'loading') {
    return <ScreenScaffold><Skeleton height={360} /></ScreenScaffold>;
  }
  if (state.status === 'error') {
    return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  }
  if (state.status === 'empty') {
    router.back();
    return null;
  }

  const d = state.data;

  return (
    <ScreenScaffold scroll>
      <View style={{ marginBottom: space[2] }}>
        <Button title="← 返回" variant="ghost" onPress={() => router.back()} />
      </View>
      <Text variant="h1">{d.summary.name}</Text>
      {msg ? <Text color="warm" style={{ marginTop: space[2] }}>{msg}</Text> : null}

      {d.screen === 'draft' && (
        <>
          <Card style={{ marginTop: space[3] }}>
            <Text color="muted">狀態：草稿</Text>
            <Text>結束於 {new Date(d.summary.ends_at).toLocaleString()}</Text>
          </Card>
          <View style={{ marginTop: space[4] }}>
            <Button title="Publish（發布活動）" onPress={() => setDialog('publish')} />
          </View>
        </>
      )}

      {d.screen === 'active' && (
        <>
          <Card style={{ marginTop: space[3] }}>
            <Text color="muted">
              剩餘 {Math.max(0, Math.floor((d as ActiveData).dashboard.activity.time_remaining_seconds / 60))} 分鐘
            </Text>
            <Text color="muted">
              中立 {(d as ActiveData).dashboard.map_summary.neutral_count} · 特殊 {(d as ActiveData).dashboard.map_summary.special_count} · 倍率 {(d as ActiveData).dashboard.map_summary.multiplier_count} / 共 {(d as ActiveData).dashboard.map_summary.total_tiles}
            </Text>
          </Card>
          <SettlementBoard
            title="財政榜（國庫）"
            rankings={[...(d as ActiveData).dashboard.groups]
              .sort((a, b) => b.treasury - a.treasury)
              .map((g, i) => ({
                group_id: g.id,
                name: g.name,
                color: g.color,
                rank: i + 1,
                value: g.treasury,
              }))}
            valueLabel="treasury"
          />
          <SettlementBoard
            title="領地榜"
            rankings={[...(d as ActiveData).dashboard.groups]
              .sort((a, b) => b.owned_count - a.owned_count)
              .map((g, i) => ({
                group_id: g.id,
                name: g.name,
                color: g.color,
                rank: i + 1,
                value: g.owned_count,
              }))}
            valueLabel="tiles"
          />
          <View style={{ marginTop: space[3] }}>
            <Button title="提前結束活動" variant="ghost" onPress={() => setDialog('end')} />
          </View>
        </>
      )}

      {d.screen === 'ended' && (
        <>
          <SectionHeader title="結算" />
          <SettlementBoard
            title="財政榜（最終）"
            rankings={(d as EndedData).settlement.rankings_treasury.map((r) => ({
              group_id: r.group_id,
              name: r.name,
              color: r.color,
              rank: r.rank,
              value: r.treasury,
            }))}
            valueLabel="treasury"
          />
          <SettlementBoard
            title="領地榜（最終）"
            rankings={(d as EndedData).settlement.rankings_territory.map((r) => ({
              group_id: r.group_id,
              name: r.name,
              color: r.color,
              rank: r.rank,
              value: r.owned_count,
            }))}
            valueLabel="tiles"
          />
          <SectionHeader title="常錯題 TOP" />
          {(d as EndedData).settlement.common_mistakes.map((m) => (
            <Card key={m.question_id} style={{ marginTop: space[2] }}>
              <Text>{m.prompt}</Text>
              <Text color="muted">錯 {m.wrong_count} 次</Text>
            </Card>
          ))}
          <SectionHeader title="正確率" />
          <Card>
            <Text>整體 {((d as EndedData).settlement.accuracy.overall.accuracy * 100).toFixed(0)}%</Text>
            <Text color="muted">
              領地 {((d as EndedData).settlement.accuracy.by_context.territory.accuracy * 100).toFixed(0)}% · 對戰 {((d as EndedData).settlement.accuracy.by_context.battle.accuracy * 100).toFixed(0)}%
            </Text>
          </Card>
        </>
      )}

      <View style={{ marginTop: space[6] }}>
        <Button
          title="結束並刪除活動"
          variant="destructive"
          onPress={() => setDelStep(deleteConfirmPlan(d.summary.status).tier === 'double' ? 1 : 2)}
        />
      </View>

      <DialogPrompt
        visible={dialog === 'publish'}
        title="發布活動？"
        body="將 snapshot 班級名單 → 隨機平衡分組 → 生成地圖 → 投放第一波。Publish 後不可逆。"
        confirmLabel={busy ? '處理中…' : 'Publish'}
        onConfirm={onPublish}
        onCancel={() => setDialog(null)}
      />
      <DialogPrompt
        visible={dialog === 'end'}
        title="提前結束活動？"
        body="學生端將立即結束，結果凍結（這不是刪除）。不可逆。"
        confirmLabel={busy ? '處理中…' : '結束'}
        onConfirm={onEnd}
        onCancel={() => setDialog(null)}
        destructive
      />
      <DialogPrompt
        visible={delStep === 1}
        title="活動尚未結束"
        body={deleteConfirmPlan(d.summary.status).firstWarning ?? ''}
        confirmLabel="仍要刪除"
        onConfirm={() => setDelStep(2)}
        onCancel={() => setDelStep(0)}
        destructive
      />
      <DialogPrompt
        visible={delStep === 2}
        title={deleteConfirmPlan(d.summary.status).finalTitle}
        body={deleteConfirmPlan(d.summary.status).finalBody}
        confirmLabel={busy ? '刪除中…' : '永久刪除'}
        onConfirm={async () => {
          setBusy(true);
          try {
            await deleteActivity(sb, activityId!);
            router.back();
          } catch (e) {
            setDelStep(0);
            setMsg(teacherConsoleErrorMessage(e) ?? mapError(e).message);
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setDelStep(0)}
        destructive
      />
    </ScreenScaffold>
  );
}
