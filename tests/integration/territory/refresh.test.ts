import { runRefreshWave } from '../../../lib/territory/refresh';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory refresh wave', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('places multiplier and special tiles on the first wave', async () => {
    const fixture = await setupTwoGroupFixture();
    await runRefreshWave(fixture.svc, fixture.activity_id);

    const { data: tiles } = await fixture.svc
      .from('hex_tiles')
      .select('kind, multiplier')
      .eq('map_id', fixture.map_id);
    const multipliers = tiles!.filter((tile) => tile.kind === 'multiplier');
    const specials = tiles!.filter((tile) => tile.kind === 'special');

    expect(multipliers.length).toBeGreaterThan(0);
    expect(specials.length).toBeGreaterThan(0);
    expect(multipliers.some((tile) => tile.multiplier === 2)).toBe(true);
  });

  it('moves special positions on the second wave', async () => {
    const fixture = await setupTwoGroupFixture();
    await runRefreshWave(fixture.svc, fixture.activity_id);

    const { data: firstSpecials } = await fixture.svc
      .from('hex_tiles')
      .select('id')
      .eq('map_id', fixture.map_id)
      .eq('kind', 'special');
    const firstIds = new Set(firstSpecials!.map((tile) => tile.id));

    await runRefreshWave(fixture.svc, fixture.activity_id);
    const { data: secondSpecials } = await fixture.svc
      .from('hex_tiles')
      .select('id')
      .eq('map_id', fixture.map_id)
      .eq('kind', 'special');

    for (const tile of secondSpecials ?? []) {
      expect(firstIds.has(tile.id)).toBe(false);
    }
  });
});
