import {
  pickLevelForStage,
  validateRoadmapConfig,
} from '../../../../lib/roadmap/level-mapping';
import { RoadmapConfig } from '../../../../lib/roadmap/types';

const sixLevelConfig: RoadmapConfig = {
  levels: [
    { level: 1, stage_start: 1, stage_end: 30 },
    { level: 2, stage_start: 31, stage_end: 60 },
    { level: 3, stage_start: 61, stage_end: 90 },
    { level: 4, stage_start: 91, stage_end: 120 },
    { level: 5, stage_start: 121, stage_end: 150 },
    { level: 6, stage_start: 151, stage_end: 180 },
  ],
};

describe('pickLevelForStage', () => {
  it('returns level 1 for stage 1', () => {
    expect(pickLevelForStage(1, sixLevelConfig)).toBe(1);
  });

  it('returns correct level at lower boundary of a range', () => {
    expect(pickLevelForStage(31, sixLevelConfig)).toBe(2);
    expect(pickLevelForStage(91, sixLevelConfig)).toBe(4);
  });

  it('returns correct level at upper boundary of a range', () => {
    expect(pickLevelForStage(30, sixLevelConfig)).toBe(1);
    expect(pickLevelForStage(60, sixLevelConfig)).toBe(2);
    expect(pickLevelForStage(180, sixLevelConfig)).toBe(6);
  });

  it('returns null when stage exceeds the final stage_end (completion sentinel)', () => {
    expect(pickLevelForStage(181, sixLevelConfig)).toBeNull();
    expect(pickLevelForStage(9999, sixLevelConfig)).toBeNull();
  });

  it('throws on stage < 1', () => {
    expect(() => pickLevelForStage(0, sixLevelConfig)).toThrow();
    expect(() => pickLevelForStage(-1, sixLevelConfig)).toThrow();
  });

  it('throws on empty levels array', () => {
    expect(() => pickLevelForStage(1, { levels: [] })).toThrow();
  });
});

describe('validateRoadmapConfig', () => {
  it('accepts a well-formed config', () => {
    expect(() => validateRoadmapConfig(sixLevelConfig)).not.toThrow();
  });

  it('rejects empty levels', () => {
    expect(() => validateRoadmapConfig({ levels: [] })).toThrow(/at least 1/i);
  });

  it('rejects first level not starting at stage 1', () => {
    expect(() =>
      validateRoadmapConfig({
        levels: [{ level: 1, stage_start: 2, stage_end: 30 }],
      }),
    ).toThrow(/stage_start.*1/i);
  });

  it('rejects non-contiguous ranges (gap)', () => {
    expect(() =>
      validateRoadmapConfig({
        levels: [
          { level: 1, stage_start: 1, stage_end: 30 },
          { level: 2, stage_start: 32, stage_end: 60 },
        ],
      }),
    ).toThrow(/contiguous|gap/i);
  });

  it('rejects level numbers that skip or repeat', () => {
    expect(() =>
      validateRoadmapConfig({
        levels: [
          { level: 1, stage_start: 1, stage_end: 30 },
          { level: 3, stage_start: 31, stage_end: 60 },
        ],
      }),
    ).toThrow(/level/);
  });

  it('rejects stage_end < stage_start', () => {
    expect(() =>
      validateRoadmapConfig({
        levels: [{ level: 1, stage_start: 10, stage_end: 5 }],
      }),
    ).toThrow();
  });
});
