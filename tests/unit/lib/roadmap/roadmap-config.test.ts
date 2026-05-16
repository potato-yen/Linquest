// tests/unit/lib/roadmap/roadmap-config.test.ts
import {
  ROADMAP_CONFIG,
  ROADMAP_BANK_ID,
  LEVEL_SHEET_TABS,
} from '../../../../lib/roadmap/roadmap-config';
import { validateRoadmapConfig } from '../../../../lib/roadmap/level-mapping';

describe('roadmap-config', () => {
  it('ROADMAP_CONFIG passes validateRoadmapConfig', () => {
    expect(() => validateRoadmapConfig(ROADMAP_CONFIG)).not.toThrow();
  });

  it('has 6 contiguous levels covering stages 1..180', () => {
    expect(ROADMAP_CONFIG.levels).toHaveLength(6);
    expect(ROADMAP_CONFIG.levels[0].stage_start).toBe(1);
    expect(ROADMAP_CONFIG.levels[5].stage_end).toBe(180);
  });

  it('ROADMAP_BANK_ID is the fixed seed UUID', () => {
    expect(ROADMAP_BANK_ID).toBe('0ad0ad0a-0000-4000-8000-000000000001');
  });

  it('LEVEL_SHEET_TABS maps every level 1..6 to its tab name', () => {
    expect(LEVEL_SHEET_TABS).toEqual({
      1: 'Level1', 2: 'Level2', 3: 'Level3',
      4: 'Level4', 5: 'Level5', 6: 'Level6',
    });
  });
});
