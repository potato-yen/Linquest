import { previewCsv } from '../../../../lib/teacher-console-ui/csv-preview';

const GOOD =
  '中文,英文,詞性\n蘋果,apple,n.\n跑,run,v.\n快樂的,happy,adj.\n書,book,n.';

describe('previewCsv', () => {
  it('returns parsed rows + count on valid CSV', () => {
    const r = previewCsv(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.count).toBe(4);
      expect(r.rows[0]).toEqual({
        prompt: '蘋果',
        correct_answer: 'apple',
        meta: { part_of_speech: 'n.' },
      });
    }
  });

  it('treats an empty 詞性 cell as no part_of_speech', () => {
    const r = previewCsv('中文,英文,詞性\n蘋果,apple,\n跑,run,v.\n書,book,n.\n貓,cat,n.');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows[0]).toEqual({ prompt: '蘋果', correct_answer: 'apple', meta: {} });
  });

  it('errors on missing required column', () => {
    const r = previewCsv('中文,詞性\n蘋果,n.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('英文');
  });

  it('errors when fewer than 4 distinct answers (cannot sample distractors)', () => {
    const r = previewCsv('中文,英文\n蘋果,apple\n紅蘋果,apple\n香蕉,banana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('4');
  });

  it('treats empty input as not-ok', () => {
    expect(previewCsv('   ').ok).toBe(false);
  });
});
