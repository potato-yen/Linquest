// tests/unit/lib/answering/engine.test.ts
import { AnsweringEngine } from '../../../../lib/answering/engine';
import { Question } from '../../../../lib/answering/types';

const Q = (id: string, c: string): Question => ({ id, prompt: '中文', correct_answer: c, distractors: ['x', 'y', 'z'] });

function fixedNow() {
  let t = 1000;
  return () => { const v = t; t += 250; return v; };
}

describe('AnsweringEngine', () => {
  it('starts at question phase with first question', async () => {
    const e = new AnsweringEngine(fixedNow());
    e.start({ questions: [Q('1', 'a'), Q('2', 'b')], enableRetry: false, onAttempt: jest.fn(), onFinish: jest.fn() });
    expect(e.state.phase).toBe('question');
    expect(e.state.current?.id).toBe('1');
  });

  it('answer → reveal phase, records attempt', async () => {
    const onAttempt = jest.fn();
    const e = new AnsweringEngine(fixedNow());
    e.start({ questions: [Q('1', 'a')], enableRetry: false, onAttempt, onFinish: jest.fn() });
    await e.answer('a');
    expect(e.state.phase).toBe('reveal');
    expect(e.state.lastAttempt).toEqual({ question_id: '1', is_correct: true, response_ms: 250, chosen: 'a' });
    expect(onAttempt).toHaveBeenCalledTimes(1);
  });

  it('next() after last question with no retries → finished + onFinish called', async () => {
    const onFinish = jest.fn();
    const e = new AnsweringEngine(fixedNow());
    e.start({ questions: [Q('1', 'a')], enableRetry: false, onAttempt: jest.fn(), onFinish });
    await e.answer('a');
    e.next();
    expect(e.state.phase).toBe('finished');
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].firstRoundResults).toHaveLength(1);
  });

  it('with enableRetry=true, incorrect answers requeue at end', async () => {
    const onFinish = jest.fn();
    const e = new AnsweringEngine(fixedNow());
    e.start({
      questions: [Q('1', 'a'), Q('2', 'b')],
      enableRetry: true, onAttempt: jest.fn(), onFinish,
    });
    await e.answer('wrong');                  // q1 wrong → retry queued
    e.next();
    expect(e.state.current?.id).toBe('2');
    await e.answer('b');                      // q2 right
    e.next();
    expect(e.state.current?.id).toBe('1');    // requeued q1 returns
    await e.answer('a');                      // q1 right this time
    e.next();
    expect(e.state.phase).toBe('finished');
    const summary = onFinish.mock.calls[0][0];
    expect(summary.firstRoundResults).toHaveLength(2);
    expect(summary.firstRoundResults[0].is_correct).toBe(false);    // q1 first-try
    expect(summary.firstRoundResults[1].is_correct).toBe(true);     // q2 first-try
    expect(summary.totalAttempts).toHaveLength(3);
  });

  it('with enableRetry=false, incorrect answers are NOT requeued', async () => {
    const onFinish = jest.fn();
    const e = new AnsweringEngine(fixedNow());
    e.start({ questions: [Q('1', 'a')], enableRetry: false, onAttempt: jest.fn(), onFinish });
    await e.answer('wrong');
    e.next();
    expect(e.state.phase).toBe('finished');
  });

  it('abort() clears state to idle', async () => {
    const e = new AnsweringEngine(fixedNow());
    e.start({ questions: [Q('1', 'a')], enableRetry: false, onAttempt: jest.fn(), onFinish: jest.fn() });
    e.abort();
    expect(e.state.phase).toBe('idle');
  });
});
