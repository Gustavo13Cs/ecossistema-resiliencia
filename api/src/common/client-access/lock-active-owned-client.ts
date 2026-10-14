import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockOwnedClient } from './lock-owned-client';

export async function lockActiveOwnedClient(
  tx: Prisma.TransactionClient,
  clientId: string,
  professionalId: string,
): Promise<void> {
  await lockOwnedClient(tx, clientId, professionalId);
  const client = await tx.client.findFirst({
    where: { id: clientId, professionalId },
    select: { status: true },
  });
  if (!client) throw new NotFoundException('Cliente não encontrado');
  if (client.status === 'ARCHIVED') {
    throw new ConflictException(
      'Cliente arquivado não pode receber novas prescrições ou avaliações',
    );
  }
}
