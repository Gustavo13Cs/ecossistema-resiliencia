import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '../../src/infra/database/prisma.service';
import { assertIsolationDatabase, isolationDatabase } from './client-isolation';

export function testAdminPrisma(): PrismaService {
  assertIsolationDatabase();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: isolationDatabase }),
  }) as unknown as PrismaService;
}
export async function clearTestReadAudits(
  prisma: PrismaService,
  professionalIds: string[],
) {
  assertIsolationDatabase();
  // Somente o owner da fixture sintetica pode expurgar os registros para resetar testes.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`ALTER TABLE client_read_audit_events DISABLE TRIGGER audit_immutable`;
    await tx.auditDeliveryState.deleteMany({
      where: { event: { tenantProfessionalId: { in: professionalIds } } },
    });
    await tx.clientReadAuditEvent.deleteMany({
      where: { tenantProfessionalId: { in: professionalIds } },
    });
    await tx.$executeRaw`ALTER TABLE client_read_audit_events ENABLE TRIGGER audit_immutable`;
  });
}
