// lib/ui/illustrations/index.ts
// Phase 4: assets are in-code SVG components (not raster require()).
// Brief: scripts/asset-spec-sheet.md. Consumers render <Component size={..} />.
import type { ComponentType } from 'react';
import type { IllustrationProps } from './scenes';
import {
  ParchmentBg,
  EmptyNoClass, EmptyNoActivity, EmptyAllDone, EmptyNoRank, EmptyStartHere,
  ErrorNetwork, ErrorServer, ErrorUnknown,
  RoadmapBg, TerritoryBg,
} from './scenes';
import { GroupCrest } from './GroupCrest';
import type { ScreenErrorKind } from '../error/mapError';

export type Illustration = ComponentType<IllustrationProps>;

export const illustrations = {
  parchmentBg: ParchmentBg,
  empty: {
    noClass: EmptyNoClass,
    noActivity: EmptyNoActivity,
    allDone: EmptyAllDone,
    noRank: EmptyNoRank,
    startHere: EmptyStartHere,
  },
  error: {
    network: ErrorNetwork,
    server: ErrorServer,
    unknown: ErrorUnknown,
  },
  trail: { roadmapBg: RoadmapBg },
  map: { territoryBg: TerritoryBg },
} as const;

// ScreenError.kind → error illustration ('auth' has no art → unknown).
export function errorIllustration(kind: ScreenErrorKind): Illustration {
  if (kind === 'network') return ErrorNetwork;
  if (kind === 'server') return ErrorServer;
  return ErrorUnknown;
}

export { GroupCrest };
export type { IllustrationProps };
