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
import { buildChoiceOrder } from '../../lib/answering/choices';
import { AnsweringEngine } from '../../lib/answering/engine';
import { Question } from '../../lib/answering/types';
import { makeBattleHostHooks } from '../../lib/answering/adapters/battle';
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

  const engine = useMemo(() => new AnsweringEngine(), []);
  const [, force] = useState(0);
  useEffect(() => engine.subscribe(() => force((x) => x + 1)), [engine]);

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

  // Drive engine once questions arrive
  const engineStarted = useRef(false);
  useEffect(() => {
    if (questions.length === 0 || engineStarted.current) return;
    engineStarted.current = true;
    const hooks = makeBattleHostHooks({
      submitBattleAnswer: (args) => submitBattleAnswer(sb, args),
      battleId,
      currentIndex: () => engine.state.currentIndex,
      onFinish: () => { /* wait for row.status='finished' from realtime */ },
    });
    engine.start({ questions, ...hooks });
    return () => { engine.abort(); engineStarted.current = false; };
  }, [questions, engine, sb, battleId]);

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
  const current = engine.state.current;
  const currentChoices = useMemo(() => {
    if (!current) return [];
    return buildChoiceOrder(current);
  }, [current?.id]);

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
              state={
                engine.state.phase === 'reveal'
                  ? c === current.correct_answer
                    ? 'correct'
                    : c === engine.state.lastAttempt?.chosen
                      ? 'incorrect'
                      : 'idle'
                  : 'idle'
              }
              onPress={() => engine.answer(c)}
            />
          ))}
          {engine.state.phase === 'reveal' && row.current_index < questions.length - 1 ? (
            <Button title="下一題 →" onPress={() => engine.next()} />
          ) : null}
          {engine.state.phase === 'question' && row.current_index_decided ? (
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
