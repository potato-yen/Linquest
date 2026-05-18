import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ScreenScaffold, Text, ChoiceCard, QuestionCard, Button, Skeleton, ErrorState,
} from '../../lib/ui/components';
import { BattleScoreHeader, SidePresence } from '../../lib/ui/components/BattleScoreHeader';
import { BattleWinFx } from '../../lib/ui/components/BattleWinFx';
import { useSession } from '../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../lib/supabase';
import { joinBattleRoom } from '../../lib/realtime-battle/room';
import { submitBattleAnswer, heartbeatBattle } from '../../lib/realtime-battle/service';
import { BattleRow } from '../../lib/realtime-battle/types';
import {
  beginBattleSubmission,
  canSubmitBattleChoice,
  createBattleClientState,
  getBattleChoiceState,
  rejectBattleSubmission,
  resolveBattleSubmission,
  syncBattleClientState,
} from '../../lib/realtime-battle/session';
import { BattleError } from '../../lib/realtime-battle/errors';
import { buildChoiceOrder } from '../../lib/answering/choices';
import { Question } from '../../lib/answering/types';
import { needsSampledDistractors, sampleDistractors } from '../../lib/answering/sample-distractors';
import { mapError } from '../../lib/ui/error/mapError';
import { space } from '../../lib/ui/tokens';

export default function BattleModal() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const sb = useRef(getSupabaseClient()).current;
  const s = useSession();
  const [row, setRow] = useState<BattleRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clientState, setClientState] = useState(createBattleClientState);
  const questionStartedAt = useRef<number>(Date.now());

  // Realtime room subscription — updates row whenever battle changes
  useEffect(() => {
    if (s.status !== 'auth') return;
    const channel = joinBattleRoom(
      battleId,
      (state) => { if (state.row) setRow(state.row); },
      sb,
    );
    return () => { sb.removeChannel(channel); };
  }, [battleId, sb, s.status]);

  // Initial fetch: battle row + questions
  useEffect(() => {
    if (s.status !== 'auth') return;
    (async () => {
      try {
        const { data: br, error: brErr } = await sb
          .from('battles')
          .select('*')
          .eq('id', battleId)
          .single();
        if (brErr || !br) throw brErr ?? new Error('battle not found');
        setRow(br as BattleRow);

        const ids = ((br as BattleRow).question_ids ?? []) as string[];
        const { data: qs, error: qErr } = await sb
          .from('questions')
          .select('id, prompt, correct_answer, distractors, meta')
          .in('id', ids);
        if (qErr) throw qErr;
        // Preserve question order matching question_ids
        const qMap = new Map((qs ?? []).map((q: Question) => [q.id, q]));
        const ordered = ids.map((id) => qMap.get(id)).filter(Boolean) as Question[];

        // Custom-bank questions have placeholder distractors + 詞性 in
        // meta. Sample distractors from the whole bank's answers and
        // compose the prompt as 中文（詞性）.
        let answerPool: string[] = [];
        if (ordered.some((q) => needsSampledDistractors(q.distractors))) {
          const { data: act } = await sb
            .from('activities')
            .select('question_bank_id')
            .eq('id', (br as BattleRow).activity_id)
            .single();
          const bankId = (act as { question_bank_id?: string } | null)?.question_bank_id;
          if (bankId) {
            const { data: bankQs } = await sb
              .from('questions')
              .select('correct_answer')
              .eq('bank_id', bankId);
            answerPool = (bankQs ?? []).map((q: { correct_answer: string }) => q.correct_answer);
          }
        }

        setQuestions(
          ordered.map((q) => {
            const pos = (q.meta as { part_of_speech?: string } | undefined)?.part_of_speech;
            return {
              ...q,
              prompt: pos ? `${q.prompt}（${pos}）` : q.prompt,
              distractors: needsSampledDistractors(q.distractors)
                ? sampleDistractors(answerPool, q.correct_answer)
                : q.distractors,
            };
          }),
        );
      } catch (e) {
        setError(mapError(e).message);
      }
    })();
  }, [battleId, sb, s.status]);

  // Heartbeat every 10s while modal is open
  useEffect(() => {
    const t = setInterval(() => {
      heartbeatBattle(sb, battleId).catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
  }, [sb, battleId]);

  useEffect(() => {
    if (!row) return;
    setClientState((prev) => syncBattleClientState(prev, row));
  }, [row?.id, row?.status, row?.current_index]);

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [row?.id, row?.current_index]);

  const current = row?.status === 'in_progress'
    ? questions[row.current_index] ?? null
    : null;
  const currentChoices = useMemo(
    () => (current ? buildChoiceOrder(current) : []),
    [current],
  );

  if (error) {
    return (
      <ScreenScaffold>
        <ErrorState error={{ kind: 'unknown', message: error }} onRetry={() => router.back()} />
      </ScreenScaffold>
    );
  }

  if (!row || questions.length === 0 || s.status !== 'auth') {
    return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  }

  const isChallenger = row.challenger_user_id === s.user.id;
  const myScore = isChallenger ? row.challenger_score : row.defender_score;
  const oppScore = isChallenger ? row.defender_score : row.challenger_score;

  const selfSide: SidePresence = {
    display_name: s.user.display_name ?? '我',
    group_color: '#6B7D54',
    score: myScore,
    isMe: true,
  };
  const oppSide: SidePresence = {
    display_name: '對手',
    group_color: '#7E3A5A',
    score: oppScore,
    isMe: false,
  };

  const finished = row.status === 'finished';
  const aborted = row.status === 'aborted';
  const won = finished && row.winner_user_id === s.user.id;

  async function onChoose(choice: string) {
    if (!row || !current || !canSubmitBattleChoice(row, clientState)) {
      return;
    }

    const questionIndex = row.current_index;
    setClientState((prev) => beginBattleSubmission(prev, row, choice));

    try {
      const result = await submitBattleAnswer(sb, {
        battle_id: row.id,
        question_index: questionIndex,
        choice,
        response_ms: Math.max(0, Date.now() - questionStartedAt.current),
      });
      setClientState((prev) => resolveBattleSubmission(prev, result));
    } catch (submitError) {
      setClientState((prev) => {
        if (prev.phase !== 'submitting' || prev.questionIndex !== questionIndex) {
          return prev;
        }
        return rejectBattleSubmission(row, mapBattleSubmitError(submitError));
      });
    }
  }

  return (
    <ScreenScaffold scroll>
      <BattleScoreHeader
        self={selfSide}
        opponent={oppSide}
        questionIndex={row.current_index}
        total={questions.length}
        deadline={row.question_deadline_at}
      />

      {!finished && !aborted && current ? (
        <View style={{ marginTop: space[3], gap: space[3] }}>
          <QuestionCard prompt={current.prompt} />
          {currentChoices.map((c, i) => (
            <ChoiceCard
              key={c}
              pick={'ABCD'[i] as 'A' | 'B' | 'C' | 'D'}
              choice={c}
              state={getBattleChoiceState(c, current.correct_answer, clientState)}
              onPress={() => {
                void onChoose(c);
              }}
            />
          ))}
          {clientState.error ? (
            <Text variant="caption" color="warm" style={{ textAlign: 'center' }}>
              {clientState.error}
            </Text>
          ) : null}
          {clientState.phase === 'submitting' ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>提交中…</Text>
          ) : null}
          {clientState.phase === 'revealed' ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>等待下一題…</Text>
          ) : null}
          {clientState.phase === 'idle' && row.current_index_decided ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>等待對方提交…</Text>
          ) : null}
        </View>
      ) : null}

      {finished ? (
        <View style={{ alignItems: 'center', marginTop: space[6], minHeight: 200 }}>
          <Text variant="h1">{won ? '勝利！' : '惜敗'}</Text>
          <BattleWinFx color={won ? selfSide.group_color : oppSide.group_color} active={won} />
          <View style={{ marginTop: space[5] }}>
            <Button title="關閉" onPress={() => router.back()} />
          </View>
        </View>
      ) : null}

      {aborted ? (
        <View style={{ marginTop: space[5], gap: space[3] }}>
          <Text variant="h3" color="warm">對戰中止：{row.abort_reason}</Text>
          <Button title="關閉" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

function mapBattleSubmitError(error: unknown): string {
  if (error instanceof BattleError) {
    switch (error.code) {
      case 'QUESTION_DEADLINE_PASSED':
        return '本題已截止，等待下一題。';
      case 'ALREADY_LOCKED':
        return '你本題已鎖定，等待對方提交。';
      case 'NOT_REVEALED_YET':
        return '題目尚未開始，請稍候。';
      case 'INDEX_IN_FUTURE':
      case 'BATTLE_NOT_IN_PROGRESS':
        return '對戰狀態已更新，請等待同步。';
      default:
        break;
    }
  }

  return mapError(error).message;
}
