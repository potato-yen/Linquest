import { HexTile, Multiplier, RefreshPolicy, TerritoryParams } from './types';

export interface MultiplierTarget {
  tile: HexTile;
  multiplier: Multiplier;
}

export interface SpecialTarget {
  id: string;
}

export interface RefreshPick {
  policy: RefreshPolicy;
  multiplier_targets: MultiplierTarget[];
  special_targets: SpecialTarget[];
}

export function pickRefreshTargets(
  tiles: HexTile[],
  previousSpecialTileIds: string[],
  params: TerritoryParams,
  rng: () => number = Math.random,
): RefreshPick {
  const previousSpecials = new Set(previousSpecialTileIds);
  const multiplierEligible = tiles.filter((tile) => !tile.is_capital);
  const neutralTiles = tiles.filter((tile) => !tile.is_capital && tile.owner_group_id === null);

  const multiplierCount = Math.round(multiplierEligible.length * params.multiplier_ratio);
  const multiplierCandidates = shuffle(multiplierEligible, rng)
    .slice(0, multiplierCount)
    .map((tile) => ({
      tile,
      multiplier: rng() < params.multiplier_2x_3x_split[0] ? 2 : 3,
    } satisfies MultiplierTarget));

  const specialCandidatePool = neutralTiles.filter((tile) => !previousSpecials.has(tile.id));
  const neutralShare = neutralTiles.length / Math.max(tiles.length, 1);
  let policy: RefreshPolicy = 'normal';
  let specialTargets: SpecialTarget[] = [];

  if (specialCandidatePool.length > 0) {
    if (neutralShare <= params.endgame_threshold) {
      policy = 'endgame_all_special';
      specialTargets = specialCandidatePool.map((tile) => ({ id: tile.id }));
    } else {
      const specialCount = Math.round(specialCandidatePool.length * params.special_ratio);
      specialTargets = shuffle(specialCandidatePool, rng)
        .slice(0, specialCount)
        .map((tile) => ({ id: tile.id }));
    }
  }

  const specialIds = new Set(specialTargets.map((target) => target.id));
  const multiplierTargets = multiplierCandidates.filter((target) => !specialIds.has(target.tile.id));

  if (multiplierTargets.length < multiplierCount) {
    const refill = shuffle(
      multiplierEligible.filter((tile) =>
        !specialIds.has(tile.id) &&
        !multiplierTargets.some((target) => target.tile.id === tile.id),
      ),
      rng,
    )
      .slice(0, multiplierCount - multiplierTargets.length)
      .map((tile) => ({
        tile,
        multiplier: rng() < params.multiplier_2x_3x_split[0] ? 2 : 3,
      } satisfies MultiplierTarget));

    multiplierTargets.push(...refill);
  }

  return {
    policy,
    multiplier_targets: multiplierTargets,
    special_targets: specialTargets,
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();

  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
  }

  return out;
}
