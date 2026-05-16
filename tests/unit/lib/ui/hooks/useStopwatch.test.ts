// tests/unit/lib/ui/hooks/useStopwatch.test.ts
import { Stopwatch } from '../../../../../lib/ui/hooks/useStopwatch';

describe('Stopwatch', () => {
  it('reports elapsed ms relative to start()', () => {
    const now = jest.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1750);
    const sw = new Stopwatch(now);
    sw.start();
    expect(sw.elapsedMs()).toBe(750);
  });

  it('returns 0 before start', () => {
    const sw = new Stopwatch(() => 0);
    expect(sw.elapsedMs()).toBe(0);
  });

  it('reset() restarts the clock', () => {
    const now = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(500).mockReturnValueOnce(800);
    const sw = new Stopwatch(now);
    sw.start();
    sw.reset();
    expect(sw.elapsedMs()).toBe(300);
  });
});
