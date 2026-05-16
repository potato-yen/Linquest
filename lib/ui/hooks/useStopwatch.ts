// lib/ui/hooks/useStopwatch.ts
// Pure class — used by AnsweringEngine in phase 1, useful as primitive in phase 0.
export class Stopwatch {
  private startedAt: number | null = null;
  constructor(private readonly now: () => number = Date.now) {}

  start(): void {
    this.startedAt = this.now();
  }

  reset(): void {
    this.start();
  }

  elapsedMs(): number {
    if (this.startedAt === null) return 0;
    return this.now() - this.startedAt;
  }
}
