import { previewCsv } from '../../../../lib/teacher-console-ui/csv-preview';
import { MIN_DISTINCT_ANSWERS, MIN_TOTAL_QUESTIONS } from '../../../../lib/teacher-console-ui/custom-bank-csv';

const GOOD_LIST = Array.from({ length: MIN_TOTAL_QUESTIONS }, (_, i) => `中文${i},英文${i},n.`).join('\n');
const GOOD = `中文,英文,詞性\n${GOOD_LIST}`;

describe('previewCsv', () => {
  it('returns parsed rows + count on valid CSV', () => {
    const r = previewCsv(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.count).toBe(MIN_TOTAL_QUESTIONS);
      expect(r.rows[0]).toEqual({
        prompt: '中文0',
        correct_answer: '英文0',
        meta: { part_of_speech: 'n.' },
      });
    }
  });

  it('treats an empty 詞性 cell as no part_of_speech', () => {
    const lines = Array.from({ length: MIN_TOTAL_QUESTIONS }, (_, i) => `中文${i},英文${i},${i === 0 ? '' : 'n.'}`).join('\n');
    const r = previewCsv(`中文,英文,詞性\n${lines}`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows[0]).toEqual({ prompt: '中文0', correct_answer: '英文0', meta: {} });
  });

  it('errors on missing required column', () => {
    const r = previewCsv('中文,詞性\n蘋果,n.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('英文');
  });

  it('errors when total questions less than MIN_TOTAL_QUESTIONS', () => {
    const r = previewCsv('中文,英文\n蘋果,apple\n香蕉,banana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('題數不足');
  });

  it('errors when fewer than MIN_DISTINCT_ANSWERS distinct answers', () => {
    // 20 rows but only 1 distinct answer
    const lines = Array.from({ length: MIN_TOTAL_QUESTIONS }, () => `中文,apple,n.`).join('\n');
    const r = previewCsv(`中文,英文,詞性\n${lines}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('答案種類不足');
  });

  it('treats empty input as not-ok', () => {
    expect(previewCsv('   ').ok).toBe(false);
  });
});
