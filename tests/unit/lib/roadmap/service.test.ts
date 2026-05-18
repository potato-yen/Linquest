import { submitRoadmapAttempt } from '../../../../lib/roadmap/service';

function makeSb() {
  return {
    from: jest.fn(),
  };
}

describe('submitRoadmapAttempt', () => {
  it('appends a roadmap attempt event with null activity-scoped fields', async () => {
    const sb = makeSb();
    const insert = jest.fn().mockResolvedValue({ error: null });
    sb.from.mockReturnValue({ insert });

    await submitRoadmapAttempt(sb as never, {
      userId: 'user-1',
      questionId: 'question-1',
      isCorrect: false,
      responseMs: 812,
    });

    expect(sb.from).toHaveBeenCalledWith('attempts');
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      question_id: 'question-1',
      activity_id: null,
      context: 'roadmap',
      tile_id: null,
      battle_id: null,
      is_correct: false,
      response_ms: 812,
    });
  });

  it('throws when the insert fails', async () => {
    const sb = makeSb();
    const insert = jest.fn().mockResolvedValue({ error: new Error('insert failed') });
    sb.from.mockReturnValue({ insert });

    await expect(
      submitRoadmapAttempt(sb as never, {
        userId: 'user-1',
        questionId: 'question-1',
        isCorrect: true,
        responseMs: 250,
      }),
    ).rejects.toThrow('insert failed');
  });
});
