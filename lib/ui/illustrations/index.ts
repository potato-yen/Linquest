// lib/ui/illustrations/index.ts
// Phase 0: all assets resolve to null. Phase 4 swaps these to require('./xxx.png').
// EmptyState/ErrorState handle null illustration by rendering text only.

export const illustrations = {
  parchmentBg: null as number | null,
  empty: {
    noClass: null as number | null,
    noActivity: null as number | null,
    allDone: null as number | null,
    noRank: null as number | null,
    startHere: null as number | null,
  },
  error: {
    network: null as number | null,
    server: null as number | null,
    unknown: null as number | null,
  },
  trail: { roadmapBg: null as number | null },
  map: { territoryBg: null as number | null },
  crest: Array.from({ length: 10 }, () => null as number | null),
} as const;
