// tests/unit/lib/roadmap/sheet-source.test.ts
import {
  toGvizCsvUrl,
  rowsToQuestions,
  sampleDistractors,
  loadSheetBank,
  resetSheetBankForTesting,
} from '../../../../lib/roadmap/sheet-source';

describe('toGvizCsvUrl', () => {
  it('builds a gviz csv url addressed by tab name', () => {
    const share =
      'https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit#gid=0';
    expect(toGvizCsvUrl(share, 'Level1')).toBe(
      'https://docs.google.com/spreadsheets/d/1AbC_dEf-123/gviz/tq?tqx=out:csv&sheet=Level1',
    );
  });

  it('url-encodes tab names with spaces', () => {
    const share = 'https://docs.google.com/spreadsheets/d/XYZ/edit';
    expect(toGvizCsvUrl(share, 'Level 1')).toContain('sheet=Level%201');
  });

  it('throws when the share url has no spreadsheet id', () => {
    expect(() => toGvizCsvUrl('https://example.com/nope', 'Level1')).toThrow(
      /spreadsheet id/i,
    );
  });
});

describe('rowsToQuestions', () => {
  const rows = [
    ['prompt', 'answer', 'example_sentence', 'ipa'],
    ['蘋果', 'apple', 'I ate an apple.', 'ˈæp.əl'],
    ['', 'skipme', '', ''], // empty prompt → skipped
    ['香蕉', 'banana', '', ''],
  ];

  it('maps columns and skips blank rows; sets meta.roadmap_level', () => {
    const qs = rowsToQuestions(rows, 2);
    expect(qs).toHaveLength(2);
    expect(qs[0]).toEqual({
      id: 'sheet-L2-r1',
      prompt: '蘋果',
      correct_answer: 'apple',
      distractors: [],
      meta: {
        roadmap_level: 2,
        example_sentence: 'I ate an apple.',
        ipa: 'ˈæp.əl',
      },
    });
    expect(qs[1].id).toBe('sheet-L2-r3');
    expect(qs[1].meta.roadmap_level).toBe(2);
  });

  it('throws when a partial header is present but required column is missing', () => {
    // First row has 'prompt' (recognized as header intent) but no 'answer'.
    expect(() => rowsToQuestions([['prompt'], ['x']], 1)).toThrow(/answer/);
  });

  it('uses positional fallback (col 0 = prompt, col 1 = answer) when no header names recognized', () => {
    const noHeader = [
      ['一個', 'a', 'art.'],
      ['第二', 'second', 'adj.'],
      ['', '', ''],          // blank row → skipped
    ];
    const qs = rowsToQuestions(noHeader, 1);
    expect(qs).toHaveLength(2);
    expect(qs[0]).toMatchObject({ id: 'sheet-L1-r0', prompt: '一個', correct_answer: 'a' });
    expect(qs[1]).toMatchObject({ id: 'sheet-L1-r1', prompt: '第二', correct_answer: 'second' });
  });
});

describe('sampleDistractors', () => {
  const pool = [
    { id: 'a', prompt: '', correct_answer: 'apple', distractors: [], meta: {} },
    { id: 'b', prompt: '', correct_answer: 'banana', distractors: [], meta: {} },
    { id: 'c', prompt: '', correct_answer: 'cherry', distractors: [], meta: {} },
    { id: 'd', prompt: '', correct_answer: 'date', distractors: [], meta: {} },
  ];

  it('returns n distinct answers excluding the correct one', () => {
    const seq = [0, 0, 0, 0];
    let k = 0;
    const rng = () => seq[k++ % seq.length];
    const d = sampleDistractors(pool, 'apple', 3, rng);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('apple');
    expect(new Set(d).size).toBe(3);
  });

  it('throws when the pool cannot supply n distractors', () => {
    expect(() => sampleDistractors(pool, 'apple', 5, Math.random)).toThrow(
      /distractor/i,
    );
  });
});

describe('loadSheetBank', () => {
  beforeEach(() => {
    resetSheetBankForTesting();
    process.env.EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL =
      'https://docs.google.com/spreadsheets/d/SHEET/edit';
  });

  it('fetches every level tab once and memoizes', async () => {
    const csv = 'prompt,answer\n中,one\n文,two\n字,three\n庫,four';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => csv,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const bank1 = await loadSheetBank();
    const bank2 = await loadSheetBank();

    expect(fetchMock).toHaveBeenCalledTimes(6); // 6 level tabs, once total
    expect(bank1).toBe(bank2); // memoized same reference
    expect(bank1[3]).toHaveLength(4);
    expect(bank1[3][0].meta.roadmap_level).toBe(3);
  });

  it('throws a clear error when the env var is missing', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL;
    resetSheetBankForTesting();
    await expect(loadSheetBank()).rejects.toThrow(
      /EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL/,
    );
  });
});
