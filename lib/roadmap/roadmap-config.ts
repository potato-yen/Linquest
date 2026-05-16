// lib/roadmap/roadmap-config.ts
// roadmap §3: level → stage range mapping now lives in code (no DB roadmap_config).
import { RoadmapConfig } from './types';
import { validateRoadmapConfig } from './level-mapping';

export const ROADMAP_CONFIG: RoadmapConfig = {
  levels: [
    { level: 1, stage_start: 1, stage_end: 30 },
    { level: 2, stage_start: 31, stage_end: 60 },
    { level: 3, stage_start: 61, stage_end: 90 },
    { level: 4, stage_start: 91, stage_end: 120 },
    { level: 5, stage_start: 121, stage_end: 150 },
    { level: 6, stage_start: 151, stage_end: 180 },
  ],
};

// Fail fast on a bad edit.
validateRoadmapConfig(ROADMAP_CONFIG);

// FK anchor row inserted by 20260516120000_roadmap_sheet_bank_seed.sql.
export const ROADMAP_BANK_ID = '0ad0ad0a-0000-4000-8000-000000000001';

// One worksheet tab per level. gviz addresses tabs by exact name.
export const LEVEL_SHEET_TABS: Record<number, string> = {
  1: 'Level1',
  2: 'Level2',
  3: 'Level3',
  4: 'Level4',
  5: 'Level5',
  6: 'Level6',
};
