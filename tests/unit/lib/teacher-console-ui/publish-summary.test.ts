import { publishSummary } from '../../../../lib/teacher-console-ui/publish-summary';

describe('publishSummary', () => {
  it('builds an irreversible-warning body with counts', () => {
    const body = publishSummary({ memberCount: 30, groupCount: 6, mapSize: 80 });
    expect(body).toContain('30');
    expect(body).toContain('6');
    expect(body).toContain('不可逆');
  });
});
