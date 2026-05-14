import { RoadmapConfig } from './types';

export function pickLevelForStage(
  stage: number,
  config: RoadmapConfig,
): number | null {
  if (!Number.isInteger(stage) || stage < 1) {
    throw new Error(`pickLevelForStage: stage must be a positive integer, got ${stage}`);
  }
  if (!config.levels || config.levels.length === 0) {
    throw new Error('pickLevelForStage: config.levels must be non-empty');
  }
  for (const lvl of config.levels) {
    if (stage >= lvl.stage_start && stage <= lvl.stage_end) {
      return lvl.level;
    }
  }
  return null;
}

export function validateRoadmapConfig(config: RoadmapConfig): void {
  if (!config.levels || config.levels.length === 0) {
    throw new Error('roadmap_config: levels must have at least 1 entry');
  }

  for (let i = 0; i < config.levels.length; i += 1) {
    const lvl = config.levels[i];
    if (lvl.level !== i + 1) {
      throw new Error(
        `roadmap_config: levels must be 1-indexed and contiguous; entry ${i} has level ${lvl.level}`,
      );
    }
    if (!Number.isInteger(lvl.stage_start) || !Number.isInteger(lvl.stage_end)) {
      throw new Error(`roadmap_config: stage_start/stage_end must be integers (level ${lvl.level})`);
    }
    if (lvl.stage_end < lvl.stage_start) {
      throw new Error(
        `roadmap_config: stage_end (${lvl.stage_end}) < stage_start (${lvl.stage_start}) at level ${lvl.level}`,
      );
    }
  }

  if (config.levels[0].stage_start !== 1) {
    throw new Error(
      `roadmap_config: first level's stage_start must be 1, got ${config.levels[0].stage_start}`,
    );
  }

  for (let i = 1; i < config.levels.length; i += 1) {
    const prev = config.levels[i - 1];
    const curr = config.levels[i];
    if (curr.stage_start !== prev.stage_end + 1) {
      throw new Error(
        `roadmap_config: ranges must be contiguous (no gap/overlap) between level ${prev.level} (end ${prev.stage_end}) and level ${curr.level} (start ${curr.stage_start})`,
      );
    }
  }
}
