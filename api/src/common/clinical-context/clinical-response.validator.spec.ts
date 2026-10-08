import { ClinicalResponseValidator } from './clinical-response.validator';
import { PrismaService } from '../../infra/database/prisma.service';

describe('Clinical response identity', () => {
  const validator = new ClinicalResponseValidator({} as PrismaService);
  it('reads the Client of a prescription rather than its nested formula items', () => {
    expect(
      validator.extract(
        { shape: 'resource' },
        {
          id: 'prescription',
          clientId: 'owned-client',
          items: [{ id: 'formula', name: 'Synthetic' }],
        },
      ),
    ).toEqual(['owned-client']);
  });
  it.each([
    [{ shape: 'client' }, [{ id: 'a' }, { id: 'b' }], ['a', 'b']],
    [{ shape: 'overview' }, { client: { id: 'a' }, assessments: [] }, ['a']],
    [{ shape: 'resource-page' }, { items: [{ clientId: 'a' }] }, ['a']],
    [{ shape: 'resource' }, { clientId: null, isTemplate: true }, []],
    [{ shape: 'ack' }, { success: true }, []],
  ] as const)('extracts identities for %j', (policy, response, ids) => {
    expect(validator.extract(policy, response)).toEqual(ids);
  });
  it.each([
    [{ shape: 'client' }, [{ name: 'Synthetic' }]],
    [{ shape: 'overview' }, { client: null }],
    [{ shape: 'resource' }, { clientId: null, isTemplate: false }],
    [{ shape: 'resource-page' }, { items: {} }],
  ] as const)(
    'rejects an unidentifiable clinical response for %j',
    (policy, response) => {
      expect(() => validator.extract(policy, response)).toThrow();
    },
  );
  it('rejects an oversized response before checking ownership', () => {
    expect(() =>
      validator.extract(
        { shape: 'client' },
        Array.from({ length: 1001 }, (_, i) => ({ id: String(i) })),
      ),
    ).toThrow('Consulta muito ampla');
  });
});
