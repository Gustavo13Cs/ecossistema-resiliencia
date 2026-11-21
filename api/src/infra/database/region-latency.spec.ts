import {
  measureRegion,
  safeFailure,
  summarize,
} from '../../../scripts/region-latency';

describe('Read-only regional PostgreSQL probe', () => {
  function setup(restricted = true) {
    let now = 0;
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn((sql: string) =>
        Promise.resolve({
          rows: sql.startsWith('SELECT\n')
            ? [{ read_only: true, restricted }]
            : [{ region_probe: 1 }],
        }),
      ),
      end: jest.fn().mockResolvedValue(undefined),
    };
    return { client, clock: () => (now += 5) };
  }
  it('measures fifteen warmed round trips, enforces READ ONLY and always disconnects', async () => {
    const { client, clock } = setup();
    const result = await measureRegion(client, 'oregon', clock);
    expect(result).toMatchObject({
      region: 'oregon',
      connectionMs: 5,
      readOnly: true,
      warmups: 3,
      count: 15,
      medianMs: 5,
      p95Ms: 5,
    });
    expect(client.query.mock.calls[0][0]).toBe('BEGIN READ ONLY');
    expect(
      client.query.mock.calls.filter(
        ([sql]) => sql === 'SELECT 1 AS region_probe',
      ),
    ).toHaveLength(18);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(client.end).toHaveBeenCalledTimes(1);
  });
  it('refuses privileged roles before measurement', async () => {
    const { client, clock } = setup(false);
    await expect(measureRegion(client, 'virginia', clock)).rejects.toThrow(
      'papel',
    );
    expect(
      client.query.mock.calls.some(
        ([sql]) => sql === 'SELECT 1 AS region_probe',
      ),
    ).toBe(false);
    expect(client.end).toHaveBeenCalledTimes(1);
  });
  it('disconnects and propagates a connection failure', async () => {
    const { client, clock } = setup();
    client.connect.mockRejectedValue(new Error('synthetic connection failure'));
    await expect(measureRegion(client, 'oregon', clock)).rejects.toThrow(
      'synthetic connection failure',
    );
    expect(client.end).toHaveBeenCalledTimes(1);
  });
  it('summarizes unsorted samples without mutating them', () => {
    const samples = [30, 10, 20];
    expect(summarize(samples)).toEqual({
      count: 3,
      minMs: 10,
      medianMs: 20,
      p95Ms: 30,
      maxMs: 30,
    });
    expect(samples).toEqual([30, 10, 20]);
    expect(() => summarize([])).toThrow();
    expect(() => summarize([NaN])).toThrow();
  });
  it('never emits raw driver errors, SQL, hosts or credentials', () => {
    const error = Object.assign(
      new Error('postgresql://secret:password@private-host'),
      { code: 'ETIMEDOUT' },
    );
    expect(safeFailure(error)).toEqual({
      kind: 'postgres-region-latency-error',
      code: 'ETIMEDOUT',
    });
    expect(safeFailure({ code: 'secret connection string' }).code).toBe(
      'PROBE_FAILED',
    );
  });
});
