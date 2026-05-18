import { deriveRoadmapProgressState } from '../../../../lib/roadmap/progress';

describe('deriveRoadmapProgressState', () => {
  it('keeps an in-range current stage playable', () => {
    expect(deriveRoadmapProgressState(3, 10)).toEqual({
      currentStage: 3,
      lastStage: 10,
      playableStage: 3,
      isComplete: false,
    });
  });

  it('treats lastStage + 1 as the completion sentinel', () => {
    expect(deriveRoadmapProgressState(11, 10)).toEqual({
      currentStage: 11,
      lastStage: 10,
      playableStage: 10,
      isComplete: true,
    });
  });
});
