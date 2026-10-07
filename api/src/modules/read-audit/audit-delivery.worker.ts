import { randomUUID } from 'node:crypto';
import { ClientReadAuditEvent, PrismaClient } from '@prisma/client';
import { assertDatabaseRole } from '../../infra/database/database-clients';

export interface AuditCopyDestination {
  // Contrato obrigatório do adaptador: persistência idempotente pelo ID, com autoridade independente.
  putIfAbsent(event: ClientReadAuditEvent): Promise<void>;
}
export class AuditDeliveryWorker {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly destination: AuditCopyDestination,
    private readonly leaseMs = 60000,
  ) {
    if (!Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000)
      throw new Error('Invalid audit delivery lease');
  }
  async deliverBatch(
    limit = 100,
  ): Promise<{ delivered: number; failed: number }> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Invalid audit delivery batch');
    await assertDatabaseRole(this.prisma, 'safemove_audit_delivery');
    const claimToken = randomUUID();
    const claimed = await this.prisma.$transaction(async (tx) => {
      const leases = await tx.$queryRaw<
        Array<{ eventId: string; leaseUntil: Date }>
      >`
    WITH pending AS (
     SELECT "eventId" FROM audit_delivery_states WHERE "deliveredAt" IS NULL
      AND ("leaseUntil" IS NULL OR "leaseUntil"<now())
     ORDER BY "eventId" LIMIT ${limit}::int FOR UPDATE SKIP LOCKED
    )
    UPDATE audit_delivery_states s SET attempts=s.attempts+1,
     "leaseToken"=${claimToken}, "leaseUntil"=now()+(${this.leaseMs}::double precision*interval '1 millisecond')
    FROM pending p WHERE s."eventId"=p."eventId" RETURNING s."eventId",s."leaseUntil"
   `;
      const events = await tx.clientReadAuditEvent.findMany({
        where: { id: { in: leases.map((row) => row.eventId) } },
      });
      return { leases, events };
    });
    // A transação de claim terminou; rede externa nunca segura a conexão HTTP ou o lock do outbox.
    let delivered = 0,
      failed = 0;
    for (const event of claimed.events) {
      try {
        await this.destination.putIfAbsent(event);
        const confirmed = await this.prisma
          .$executeRaw`UPDATE audit_delivery_states SET "deliveredAt"=clock_timestamp(),"leaseUntil"=NULL,"leaseToken"=NULL
      WHERE "eventId"=${event.id} AND "leaseToken"=${claimToken} AND "deliveredAt" IS NULL`;
        delivered += confirmed;
      } catch {
        failed++;
        await this.prisma
          .$executeRaw`UPDATE audit_delivery_states SET "leaseUntil"=NULL,"leaseToken"=NULL
      WHERE "eventId"=${event.id} AND "leaseToken"=${claimToken} AND "deliveredAt" IS NULL`;
      }
    }
    return { delivered, failed };
  }
  async pendingStats() {
    await assertDatabaseRole(this.prisma, 'safemove_audit_delivery');
    return this.prisma.$queryRaw<
      Array<{ pending: bigint; oldest: Date | null; attempts: bigint | null }>
    >`
   SELECT count(*) AS pending,min(e."occurredAt") AS oldest,max(s.attempts)::bigint AS attempts
   FROM audit_delivery_states s JOIN client_read_audit_events e ON e.id=s."eventId" WHERE s."deliveredAt" IS NULL
  `;
  }
}
