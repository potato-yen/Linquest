import { previewCsv } from '../../../../lib/teacher-console-ui/csv-preview';

const GOOD =
  `中文,英文,詞性
蘋果,apple,n.
跑,run,v.
快樂的,happy,adj.
書,book,n.
貓,cat,n.
狗,dog,n.
喝,drink,v.
吃,eat,v.
高的,tall,adj.
小的,small,adj.
紅色,red,adj.
藍色,blue,adj.
老師,teacher,n.
學生,student,n.
桌子,table,n.
椅子,chair,n.
打開,open,v.
關閉,close,v.`;

describe('previewCsv', () => {
  it('returns parsed rows + count on valid CSV', () => {
    const r = previewCsv(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.count).toBe(18);
      expect(r.rows[0]).toEqual({
        prompt: '蘋果',
        correct_answer: 'apple',
        meta: { part_of_speech: 'n.' },
      });
    }
  });

  it('treats an empty 詞性 cell as no part_of_speech', () => {
    const r = previewCsv(
      `中文,英文,詞性
蘋果,apple,
跑,run,v.
書,book,n.
貓,cat,n.
狗,dog,n.
喝,drink,v.
吃,eat,v.
高的,tall,adj.
小的,small,adj.
紅色,red,adj.
藍色,blue,adj.
老師,teacher,n.
學生,student,n.
桌子,table,n.
椅子,chair,n.
打開,open,v.
關閉,close,v.
快樂的,happy,adj.`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows[0]).toEqual({ prompt: '蘋果', correct_answer: 'apple', meta: {} });
  });

  it('errors on missing required column', () => {
    const r = previewCsv('中文,詞性\n蘋果,n.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('英文');
  });

  it('errors when fewer than 4 distinct answers (cannot sample distractors)', () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, index) => `蘋果${index},apple`),
      ...Array.from({ length: 6 }, (_, index) => `香蕉${index},banana`),
      ...Array.from({ length: 6 }, (_, index) => `櫻桃${index},cherry`),
    ].join('\n');
    const r = previewCsv(`中文,英文\n${rows}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('4');
  });

  it('errors when the bank is smaller than the largest territory challenge', () => {
    const rows = Array.from({ length: 17 }, (_, index) => `題${index},ans-${index},n.`).join('\n');
    const r = previewCsv(`中文,英文,詞性\n${rows}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('18');
  });

  it('treats empty input as not-ok', () => {
    expect(previewCsv('   ').ok).toBe(false);
  });
});
