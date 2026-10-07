import { PrismaService } from './prisma.service';

describe('Clinical database boundary', () => {
  it('does not expose a clinical delegate or raw query outside a request context', () => {
    const previous = process.env.CLINICAL_DATABASE_URL;
    process.env.CLINICAL_DATABASE_URL =
      'postgresql://synthetic:synthetic@localhost:5434/ecossistema_resiliencia_test';
    const prisma = new PrismaService();
    if (previous === undefined) delete process.env.CLINICAL_DATABASE_URL;
    else process.env.CLINICAL_DATABASE_URL = previous;
    expect(() => prisma.client).toThrow('Clinical database context required');
    expect(() => prisma.$queryRaw).toThrow(
      'Clinical database context required',
    );
  });
});

describe('Bounded clinical transaction configuration', () => {
  it('rejects invalid timeouts before opening a database client', () => {
    const before = process.env.CLINICAL_TRANSACTION_TIMEOUT_MS;
    process.env.CLINICAL_TRANSACTION_TIMEOUT_MS = 'Infinity';
    try {
      expect(() => new PrismaService()).toThrow(
        'Invalid CLINICAL_TRANSACTION_TIMEOUT_MS',
      );
    } finally {
      if (before === undefined)
        delete process.env.CLINICAL_TRANSACTION_TIMEOUT_MS;
      else process.env.CLINICAL_TRANSACTION_TIMEOUT_MS = before;
    }
  });
});
