import {
  planAllGroupSpawns,
  planCapital,
  planRegularInitial,
} from '../../../../lib/territory/generator';
import { distance } from '../../../../lib/territory/coords';
import { generateShape } from '../../../../lib/territory/shape';
import { TERRITORY_DEFAULTS } from '../../../../lib/territory/types';

describe('planCapital / planRegularInitial', () => {
  const tiles = generateShape(80);

  it('planCapital returns a contiguous cluster from the seed', () => {
    const capital = planCapital({ q: 0, r: 0 }, 6, tiles);

    expect(capital).toHaveLength(6);

    for (const coord of capital.slice(1)) {
      expect(capital.some((other) => other !== coord && distance(other, coord) === 1)).toBe(true);
    }
  });

  it('planRegularInitial expands out from the capital boundary', () => {
    const capital = planCapital({ q: 0, r: 0 }, 6, tiles);
    const regular = planRegularInitial(capital, 3, tiles);

    expect(regular).toHaveLength(3);
    expect(regular.every((coord) => capital.some((capitalCoord) => distance(capitalCoord, coord) === 1))).toBe(true);
  });
});

describe('planAllGroupSpawns', () => {
  const tiles = generateShape(80);

  it('respects the minimum inter-capital distance', () => {
    const result = planAllGroupSpawns(
      tiles,
      [
        { group_id: 'g1', member_count: 6 },
        { group_id: 'g2', member_count: 6 },
        { group_id: 'g3', member_count: 5 },
      ],
      TERRITORY_DEFAULTS,
      () => 0.5,
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const seeds = result.spawns.map((spawn) => spawn.capital_seed);
    const threshold = Math.floor(10 * TERRITORY_DEFAULTS.min_inter_capital_distance_factor);

    for (let left = 0; left < seeds.length; left += 1) {
      for (let right = left + 1; right < seeds.length; right += 1) {
        expect(distance(seeds[left], seeds[right])).toBeGreaterThanOrEqual(threshold);
      }
    }
  });

  it('fails when the map is too small for the groups', () => {
    const result = planAllGroupSpawns(
      generateShape(20),
      [
        { group_id: 'g1', member_count: 6 },
        { group_id: 'g2', member_count: 6 },
        { group_id: 'g3', member_count: 6 },
        { group_id: 'g4', member_count: 6 },
      ],
      TERRITORY_DEFAULTS,
      () => 0.5,
    );

    expect(result.success).toBe(false);
  });
});
