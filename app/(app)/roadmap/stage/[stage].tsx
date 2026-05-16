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
  }, [state, s, engine, stageNum]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error')   return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty')   return <ScreenScaffold><Text>沒有題目</Text></ScreenScaffold>;

  const eState = engine.state;
  if (!eState.current && eState.phase !== 'reveal') {
    return <ScreenScaffold><Skeleton height={300} /></ScreenScaffold>;
  }

  const q = (eState.current ?? eState.lastAttempt) ? eState.current ?? state.data.questions.find((x) => x.id === eState.lastAttempt!.question_id)! : null;
  const choices: { pick: 'A' | 'B' | 'C' | 'D'; choice: string }[] = q
    ? shuffle([q.correct_answer, ...q.distractors]).map((c, i) => ({ pick: 'ABCD'[i] as any, choice: c }))
    : [];

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

// Local shuffle (deterministic per question by sorting the unshuffled array's index would be better
// but for v1 visual variation, Math.random is acceptable; the per-question record is what counts).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
