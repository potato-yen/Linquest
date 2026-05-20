import { previewCsv } from '../../../../lib/teacher-console-ui/csv-preview';
import { MIN_DISTINCT_ANSWERS } from '../../../../lib/teacher-console-ui/custom-bank-csv';

const GOOD_LIST = Array.from({ length: MIN_DISTINCT_ANSWERS }, (_, i) => `中文${i},英文${i},n.`).join('\n');
const GOOD = `中文,英文,詞性\n${GOOD_LIST}`;

describe('previewCsv', () => {
  it('returns parsed rows + count on valid CSV', () => {
    const r = previewCsv(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.count).toBe(MIN_DISTINCT_ANSWERS);
      expect(r.rows[0]).toEqual({
        prompt: '中文0',
        correct_answer: '英文0',
        meta: { part_of_speech: 'n.' },
      });
    }
  });

  it('treats an empty 詞性 cell as no part_of_speech', () => {
    const lines = Array.from({ length: MIN_DISTINCT_ANSWERS }, (_, i) => `中文${i},英文${i},${i === 0 ? '' : 'n.'}`).join('\n');
    const r = previewCsv(`中文,英文,詞性\n${lines}`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows[0]).toEqual({ prompt: '中文0', correct_answer: '英文0', meta: {} });
  });

  it('errors on missing required column', () => {
    const r = previewCsv('中文,詞性\n蘋果,n.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('英文');
  });

  it('errors when fewer than MIN_DISTINCT_ANSWERS distinct answers (cannot sample distractors)', () => {
    const r = previewCsv('中文,英文\n蘋果,apple\n紅蘋果,apple\n香蕉,banana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain(MIN_DISTINCT_ANSWERS.toString());
  });

  it('treats empty input as not-ok', () => {
    expect(previewCsv('   ').ok).toBe(false);
  });
});
