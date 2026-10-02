import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Serializa substituições de planos pelo Client, inclusive quando não há plano ativo.
export async function lockOwnedClient(
  tx: Prisma.TransactionClient,
  clientId: string,
  professionalId: string,
) {
  const owned = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "clients"
    WHERE "id" = ${clientId} AND "professionalId" = ${professionalId}
    FOR UPDATE
  `;
  if (owned.length === 0) throw new NotFoundException('Cliente não encontrado');
}
