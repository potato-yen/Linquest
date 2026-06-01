// app/(app)/roadmap/stage/[stage].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ScreenScaffold, Text, Button, Skeleton, ErrorState } from '../../../../lib/ui/components';
import { ProgressBar } from '../../../../lib/ui/components/ProgressBar';
import { ChoiceCard } from '../../../../lib/ui/components/ChoiceCard';
import { QuestionCard } from '../../../../lib/ui/components/QuestionCard';
import { FlashCard } from '../../../../lib/ui/components/FlashCard';
import { useSession } from '../../../../lib/ui/session/useSession';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { selectStageQuestions, submitRoadmapAttempt, upsertProgress } from '../../../../lib/roadmap/service';
import { AnsweringEngine } from '../../../../lib/answering/engine';
import { Attempt, Question } from '../../../../lib/answering/types';
import { makeRoadmapHostHooks } from '../../../../lib/answering/adapters/roadmap';
import { buildChoiceOrder } from '../../../../lib/answering/choices';
import { shouldUnlock } from '../../../../lib/roadmap/unlock';
import { getSupabaseClient } from '../../../../lib/supabase';
import { space } from '../../../../lib/ui/tokens';

export default function StageScreen() {
  const { stage } = useLocalSearchParams<{ stage: string }>();
  const stageNum = Number(stage);
  const s = useSession();
  const sb = getSupabaseClient();
  const userId = s.status === 'auth' ? s.user.id : null;

  const { state, refresh } = useScreenData(async () => {
    if (s.status !== 'auth') return null;
    const qs = await selectStageQuestions(s.user.id, stageNum);
    return { questions: qs.map((q) => ({
      id: q.id, prompt: q.prompt, correct_answer: q.correct_answer, distractors: q.distractors, meta: q.meta,
    } as Question)) };
  }, [stageNum, userId]);

  const [isPreviewing, setIsPreviewing] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);

  const engine = useMemo(() => new AnsweringEngine(), []);
  const [, setTick] = useState(0);
  useEffect(() => engine.subscribe(() => setTick((t) => t + 1)), [engine]);

  const eState = engine.state;

  // Shuffle once per question; keep the same order through answer → reveal so
  // choices don't reorder on every setTick re-render.
  const choices = useMemo<{ pick: 'A' | 'B' | 'C' | 'D'; choice: string }[]>(() => {
    const q = eState.current;
    if (!q) return [];
    return buildChoiceOrder(q).map((c, i) => ({
      pick: 'ABCD'[i] as 'A' | 'B' | 'C' | 'D',
      choice: c,
    }));
  }, [eState.current?.id]);

  // Start engine only when preview is finished
  useEffect(() => {
    if (state.status !== 'ready' || !userId || isPreviewing) return;
    const hooks = makeRoadmapHostHooks({
      onAttempt: (attempt: Attempt) =>
        submitRoadmapAttempt(sb, {
          userId: userId,
          questionId: attempt.question_id,
          isCorrect: attempt.is_correct,
          responseMs: attempt.response_ms,
        }),
      onFinish: (sum) => {
        // Save progress before navigating; fire-and-forget so navigation isn't blocked.
        const correct = sum.firstRoundResults.filter((a) => a.is_correct).length;
        if (shouldUnlock(correct, sum.firstRoundResults.length)) {
          upsertProgress(sb, userId, stageNum + 1).catch((e) =>
            console.error('[roadmap] upsertProgress failed:', e),
          );
        }
        router.replace({
          pathname: `/(app)/roadmap/stage/${stageNum}/result`,
          params: { fr: JSON.stringify(sum.firstRoundResults) },
        });
      },
    });
    engine.start({ questions: state.data.questions, ...hooks });
    return () => {
      void engine.abort();
    };
  }, [state.status, userId, engine, stageNum, isPreviewing]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error')   return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty')   return <ScreenScaffold><Text>沒有題目</Text></ScreenScaffold>;

  // Preview Mode
  if (isPreviewing) {
    const q = state.data.questions[previewIndex];
    return (
      <ScreenScaffold scroll>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text color="muted">Stage {stageNum}：預覽單字</Text>
          <Text color="muted">{previewIndex + 1} / {state.data.questions.length}</Text>
        </View>
        <ProgressBar progress={(previewIndex + 1) / state.data.questions.length} />
        
        <View style={{ marginTop: space[4], marginBottom: space[4] }}>
          <FlashCard question={q} showBoth={true} />
        </View>

        <View style={{ gap: space[3] }}>
          {previewIndex < state.data.questions.length - 1 ? (
            <Button title="下一個單字" onPress={() => setPreviewIndex(i => i + 1)} />
          ) : (
            <Button title="開始挑戰！" onPress={() => setIsPreviewing(false)} />
          )}
          {previewIndex > 0 && (
            <Button title="上一個" variant="ghost" onPress={() => setPreviewIndex(i => i - 1)} />
          )}
          <Button title="跳過預覽" variant="ghost" onPress={() => setIsPreviewing(false)} />
        </View>
      </ScreenScaffold>
    );
  }

  if (!eState.current && eState.phase !== 'reveal') {
    return <ScreenScaffold><Skeleton height={300} /></ScreenScaffold>;
  }

  const q = (eState.current ?? eState.lastAttempt)
    ? eState.current ?? state.data.questions.find((x) => x.id === eState.lastAttempt!.question_id)!
    : null;
  const lastChosen = eState.lastAttempt?.chosen;

  return (
    <ScreenScaffold scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text color="muted">Stage {stageNum}</Text>
        <Text color="muted">{eState.firstRoundResults.length} / {eState.firstRoundCount}{eState.retryQueueLength > 0 ? ` · 補考 +${eState.retryQueueLength}` : ''}</Text>
      </View>
      <ProgressBar progress={eState.firstRoundCount > 0 ? eState.firstRoundResults.length / eState.firstRoundCount : 0} />

      {q ? <QuestionCard prompt={q.prompt} ipa={q.meta?.ipa as string | undefined} /> : null}

      <View style={{ gap: space[3] }}>
        {choices.map(({ pick, choice }) => {
          let cs: 'idle' | 'correct' | 'incorrect' = 'idle';
          if (eState.phase === 'reveal' && q) {
            if (choice === q.correct_answer) cs = 'correct';
            else if (choice === lastChosen) cs = 'incorrect';
          }
          return <ChoiceCard key={pick} pick={pick} choice={choice} state={cs} onPress={() => engine.answer(choice)} />;
        })}
      </View>

      {eState.phase === 'reveal' && q ? (
        <>
          <FlashCard question={q} isCorrect={!!eState.lastAttempt?.is_correct} />
          <Button title={eState.firstRoundResults.length === eState.firstRoundCount && eState.retryQueueLength === 0 ? '看結果 →' : '下一題 →'} onPress={() => engine.next()} />
        </>
      ) : null}
    </ScreenScaffold>
  );
}
