import { parseBankCsv } from '../../../../lib/question-bank/seed';

describe('parseBankCsv', () => {
  it('parses header + rows into question seed rows', () => {
    const csv = `prompt,correct_answer,distractor_1,distractor_2,distractor_3,difficulty
abandon,放棄,接受,拋光,延長,standard
ephemeral,短暫的,永恆的,實體的,正式的,advanced
`;

    const rows = parseBankCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      prompt: 'abandon',
      correct_answer: '放棄',
      distractors: ['接受', '拋光', '延長'],
      meta: { difficulty: 'standard' },
    });
    expect(rows[1].meta.difficulty).toBe('advanced');
  });

  it('throws if a row is missing distractors', () => {
    const csv =
      'prompt,correct_answer,distractor_1,distractor_2,distractor_3,difficulty\nfoo,bar,baz,,,standard\n';

    expect(() => parseBankCsv(csv)).toThrow(/3 distractors/);
  });
});
