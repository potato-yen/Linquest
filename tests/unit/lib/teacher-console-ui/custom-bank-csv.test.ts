import { parseCustomBankCsv } from '../../../../lib/teacher-console-ui/custom-bank-csv';

describe('parseCustomBankCsv', () => {
  it('parses 中文/英文/詞性 rows', () => {
    const rows = parseCustomBankCsv('中文,英文,詞性\n蘋果,apple,n.\n跑,run,v.');
    expect(rows).toEqual([
      { prompt: '蘋果', correct_answer: 'apple', meta: { part_of_speech: 'n.' } },
      { prompt: '跑', correct_answer: 'run', meta: { part_of_speech: 'v.' } },
    ]);
  });

  it('accepts ascii header aliases and omits empty 詞性', () => {
    const rows = parseCustomBankCsv('prompt,answer\n貓,cat');
    expect(rows).toEqual([{ prompt: '貓', correct_answer: 'cat', meta: {} }]);
  });

  it('tolerates trailing blank lines', () => {
    const rows = parseCustomBankCsv('中文,英文\n貓,cat\n\n');
    expect(rows).toHaveLength(1);
  });

  it('throws when a row is missing 中文 or 英文', () => {
    expect(() => parseCustomBankCsv('中文,英文\n蘋果,')).toThrow(/必填/);
  });

  it('throws when a required column is absent', () => {
    expect(() => parseCustomBankCsv('英文,詞性\napple,n.')).toThrow(/中文/);
  });
});
