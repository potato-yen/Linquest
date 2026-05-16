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
import { selectStageQuestions } from '../../../../lib/roadmap/service';
import { AnsweringEngine } from '../../../../lib/answering/engine';
import { Question } from '../../../../lib/answering/types';
import { makeRoadmapHostHooks } from '../../../../lib/answering/adapters/roadmap';
import { space } from '../../../../lib/ui/tokens';

export default function StageScreen() {
  const { stage } = useLocalSearchParams<{ stage: string }>();
  const stageNum = Number(stage);
  const s = useSession();

  const { state, refresh } = useScreenData(async () => {
    if (s.status !== 'auth') return null;
    const qs = await selectStageQuestions(stageNum);
    return { questions: qs.map((q) => ({
      id: q.id, prompt: q.prompt, correct_answer: q.correct_answer, distractors: q.distractors, meta: q.meta,
    } as Question)) };
  }, [stageNum]);

  const engine = useMemo(() => new AnsweringEngine(), []);
  const [, setTick] = useState(0);
  useEffect(() => engine.subscribe(() => setTick((t) => t + 1)), [engine]);

  const eState = engine.state;

  // Shuffle once per question; keep the same order through answer → reveal so
  // choices don't reorder on every setTick re-render.
  const choices = useMemo<{ pick: 'A' | 'B' | 'C' | 'D'; choice: string }[]>(() => {
    const q = eState.current;
    if (!q) return [];
    return shuffle([q.correct_answer, ...q.distractors]).map((c, i) => ({
      pick: 'ABCD'[i] as 'A' | 'B' | 'C' | 'D',
      choice: c,
    }));
  }, [eState.current?.id]);

  // Use primitive deps (state.status, s.status) so this effect doesn't re-run
  // on every setTick. Using full object deps (state, s) would cause abort()
  // cleanup → notify() → setTick → re-render → cleanup again → infinite loop.
  useEffect(() => {
    if (state.status !== 'ready' || s.status !== 'auth') return;
    const hooks = makeRoadmapHostHooks({
      onFinish: (sum) => {
        router.replace({
          pathname: `/(app)/roadmap/stage/${stageNum}/result`,
          params: { fr: JSON.stringify(sum.firstRoundResults) },
        });
      },
    });
    engine.start({ questions: state.data.questions, ...hooks });
    return () => engine.abort();
  }, [state.status, s.status, engine, stageNum]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error')   return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty')   return <ScreenScaffold><Text>沒有題目</Text></ScreenScaffold>;

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
