export interface RoadmapProgressState {
  currentStage: number;
  lastStage: number;
  playableStage: number;
  isComplete: boolean;
}

export function deriveRoadmapProgressState(
  currentStage: number,
  lastStage: number,
): RoadmapProgressState {
  if (!Number.isInteger(currentStage) || currentStage < 1) {
    throw new Error(`deriveRoadmapProgressState: invalid currentStage ${currentStage}`);
  }

  if (!Number.isInteger(lastStage) || lastStage < 1) {
    throw new Error(`deriveRoadmapProgressState: invalid lastStage ${lastStage}`);
  }

  return {
    currentStage,
    lastStage,
    playableStage: Math.min(currentStage, lastStage),
    isComplete: currentStage > lastStage,
  };
}
