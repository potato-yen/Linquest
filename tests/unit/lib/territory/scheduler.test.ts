import { planTerritoryTickWork } from '../../../../lib/territory/scheduler';

describe('planTerritoryTickWork', () => {
  it('marks overdue refresh and tax work only for active activities', () => {
    const now = new Date('2026-05-10T12:00:00.000Z');
    const plan = planTerritoryTickWork(
      [
        {
          id: 'a1',
          status: 'active',
          next_refresh_at: '2026-05-10T11:55:00.000Z',
          next_tax_at: '2026-05-10T12:05:00.000Z',
        },
        {
          id: 'a2',
          status: 'active',
          next_refresh_at: '2026-05-10T12:10:00.000Z',
          next_tax_at: '2026-05-10T11:50:00.000Z',
        },
        {
          id: 'a3',
          status: 'ended',
          next_refresh_at: '2026-05-10T11:00:00.000Z',
          next_tax_at: '2026-05-10T11:00:00.000Z',
        },
      ],
      now,
    );

    expect(plan).toEqual([
      { activity_id: 'a1', refresh_due: true, tax_due: false },
      { activity_id: 'a2', refresh_due: false, tax_due: true },
    ]);
  });

  it('treats missing timestamps as not due', () => {
    const now = new Date('2026-05-10T12:00:00.000Z');
    const plan = planTerritoryTickWork(
      [
        {
          id: 'a1',
          status: 'active',
          next_refresh_at: null,
          next_tax_at: null,
        },
      ],
      now,
    );

    expect(plan).toEqual([]);
  });
});
