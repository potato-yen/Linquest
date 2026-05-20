import { calculateSpacedRepetition, submitRoadmapAttempt, ROADMAP_BANK_ID } from '../../../../lib/roadmap/service';

function makeSb() {
  const insert = jest.fn().mockReturnValue({ error: null });
  const upsert = jest.fn().mockReturnValue({ error: null });
  const select = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  const from = jest.fn().mockImplementation((table) => {
    if (table === 'attempts') return { insert };
    if (table === 'roadmap_mastery') return { select: select, upsert };
    return {};
  });

  return { from, insert, upsert, select };
}

describe('calculateSpacedRepetition', () => {
  it('increments mastery and calculates intervals for correct answers', () => {
    const r1 = calculateSpacedRepetition(true, 0);
    expect(r1.nextMasteryLevel).toBe(1);
    expect(r1.intervalDays).toBe(1);

    const r2 = calculateSpacedRepetition(true, 4);
    expect(r2.nextMasteryLevel).toBe(5);
    expect(r2.intervalDays).toBe(30);

    const r3 = calculateSpacedRepetition(true, 5);
    expect(r3.nextMasteryLevel).toBe(5);
    expect(r3.intervalDays).toBe(30);
  });

  it('decrements mastery and calculates intervals for incorrect answers', () => {
    const r1 = calculateSpacedRepetition(false, 3);
    expect(r1.nextMasteryLevel).toBe(2);
    expect(r1.intervalDays).toBe(6);

    const r2 = calculateSpacedRepetition(false, 0);
    expect(r2.nextMasteryLevel).toBe(0);
    expect(r2.intervalDays).toBe(0.5);
  });
});

describe('submitRoadmapAttempt', () => {
  it('records attempt and upserts mastery', async () => {
    const sb = makeSb();
    
    await submitRoadmapAttempt(sb as any, {
      userId: 'user-1',
      questionId: 'L1_01',
      isCorrect: true,
      responseMs: 1000,
    });

    expect(sb.from).toHaveBeenCalledWith('attempts');
    expect(sb.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      is_correct: true,
      payload: { stable_question_id: 'L1_01' }
    }));

    expect(sb.from).toHaveBeenCalledWith('roadmap_mastery');
    expect(sb.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      bank_id: ROADMAP_BANK_ID,
      question_id: 'L1_01',
      mastery_level: 1, // 0 -> 1
    }), expect.anything());
  });
});
