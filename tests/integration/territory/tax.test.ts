import { runTaxTick } from '../../../lib/territory/tax';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory tax tick', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('credits treasury by rate times owned count', async () => {
    const fixture = await setupTwoGroupFixture();
    const before = await fixture.getTreasury(fixture.attackerGroupId);
    const owned = (await fixture.getOwnedTiles(fixture.attackerGroupId)).length;

    await runTaxTick(fixture.svc, fixture.activity_id);

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(owned);
  });

  it('uses relief mode when a group only has capital and low treasury', async () => {
    const fixture = await setupTwoGroupFixture();
    await fixture.svc.from('groups').update({ treasury: 5 }).eq('id', fixture.attackerGroupId);
    await fixture.svc
      .from('hex_tiles')
      .update({ owner_group_id: null })
      .eq('map_id', fixture.map_id)
      .eq('owner_group_id', fixture.attackerGroupId)
      .eq('is_capital', false);

    const capitalCount = (await fixture.getOwnedTiles(fixture.attackerGroupId)).length;
    await runTaxTick(fixture.svc, fixture.activity_id);

    expect(await fixture.getTreasury(fixture.attackerGroupId)).toBe(5 + capitalCount * 2);
  });
});
