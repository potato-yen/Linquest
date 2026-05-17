import { previewCsv } from '../../../../lib/teacher-console-ui/csv-preview';

const GOOD = 'prompt,correct_answer,distractor_1,distractor_2,distractor_3,difficulty\n蘋果,apple,banana,cat,dog,standard';

describe('previewCsv', () => {
  it('returns parsed rows + count on valid CSV', () => {
    const r = previewCsv(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.count).toBe(1);
      expect(r.rows[0]).toEqual({
        prompt: '蘋果', correct_answer: 'apple',
        distractors: ['banana', 'cat', 'dog'], meta: { difficulty: 'standard' },
      });
    }
  });
  it('returns an error message on missing column', () => {
    const r = previewCsv('prompt,correct_answer\na,b');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('missing column');
  });
  it('treats empty input as not-ok', () => {
    expect(previewCsv('   ').ok).toBe(false);
  });
});
