// tests/unit/lib/roadmap/csv.test.ts
import { parseCsv } from '../../../../lib/roadmap/csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles quoted field with comma', () => {
    expect(parseCsv('a,b\n"hello, world",2')).toEqual([
      ['a', 'b'],
      ['hello, world', '2'],
    ]);
  });

  it('handles escaped quote ("") inside quoted field', () => {
    expect(parseCsv('a\n"she said ""hi"""')).toEqual([
      ['a'],
      ['she said "hi"'],
    ]);
  });

  it('handles newline inside quoted field', () => {
    expect(parseCsv('a,b\n"line1\nline2",2')).toEqual([
      ['a', 'b'],
      ['line1\nline2', '2'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('returns [] for empty input', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('   \n  ')).toEqual([]);
  });
});
