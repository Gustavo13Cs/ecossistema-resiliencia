import { ReadAuditService } from './read-audit.service';
import { PrismaService } from '../../infra/database/prisma.service';

describe('Explicit clinical response extraction', () => {
  const service = new ReadAuditService({} as PrismaService);
  it('extracts the root Client of a supplement instead of treating its items as a page', () => {
    expect(
      service.extract(
        { domain: 'SUPPLEMENT', shape: 'resource' },
        {
          id: 'prescription',
          clientId: 'owned',
          items: [{ id: 'formula', name: 'synthetic' }],
        },
      ),
    ).toEqual(['owned']);
  });
});
