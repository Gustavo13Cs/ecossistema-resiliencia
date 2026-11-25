import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhysioScaleType, Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreatePhysioFunctionalScaleDto } from './dto/physio-functional-scale.dto';
import { scorePhysioFunctionalScale } from './physio-functional-scales.scoring';

export const PHYSIO_SCALE_SELECT = {
  id: true,
  clientId: true,
  scaleType: true,
  evaluatedAt: true,
  answers: true,
  rawScore: true,
  normalizedScore: true,
  scoreUnit: true,
  classification: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PhysioFunctionalScaleSelect;

@Injectable()
export class PhysioFunctionalScalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async listByClient(
    user: AuthUser,
    clientId: string,
    scaleType?: PhysioScaleType,
  ) {
    this.assertPhysiotherapist(user);
    const client = await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.physioFunctionalScale.findMany({
      where: {
        clientId: client.id,
        professionalId: user.sub,
        ...(scaleType ? { scaleType } : {}),
      },
      select: PHYSIO_SCALE_SELECT,
      orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  async create(user: AuthUser, dto: CreatePhysioFunctionalScaleDto) {
    this.assertPhysiotherapist(user);
    const scored = scorePhysioFunctionalScale(dto.scaleType, dto.answers);
    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    const notes = dto.notes?.trim() ? dto.notes.trim() : null;
    const evaluatedAt = dto.evaluatedAt
      ? new Date(dto.evaluatedAt)
      : new Date();

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);
      return tx.physioFunctionalScale.create({
        data: {
          clientId: client.id,
          professionalId: user.sub,
          scaleType: dto.scaleType,
          evaluatedAt,
          answers: scored.canonicalAnswers as Prisma.InputJsonValue,
          rawScore: scored.rawScore,
          normalizedScore: scored.normalizedScore,
          scoreUnit: scored.scoreUnit,
          classification: scored.classification,
          notes,
        },
        select: PHYSIO_SCALE_SELECT,
      });
    });
  }

  async remove(user: AuthUser, id: string) {
    this.assertPhysiotherapist(user);
    const existing = await this.prisma.physioFunctionalScale.findFirst({
      where: { id, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Escala funcional não encontrada');
    }
    await this.clientAccess.getOwnedClient(user, existing.clientId);

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId, user.sub);
      return tx.physioFunctionalScale.delete({
        where: {
          id: existing.id,
          clientId: existing.clientId,
          professionalId: user.sub,
        },
        select: { id: true, clientId: true },
      });
    });
  }

  private assertPhysiotherapist(user: AuthUser) {
    if (user.role !== 'PHYSIO') {
      throw new ForbiddenException('Acesso permitido somente a fisioterapeuta');
    }
  }
}
