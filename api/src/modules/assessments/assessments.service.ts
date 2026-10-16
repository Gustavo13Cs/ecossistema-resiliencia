import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { validateAssessmentMeasurements } from './domain/assessment-input';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createAssessmentDto: CreateAssessmentDto,
    professionalId: string,
  ) {
    validateAssessmentMeasurements(createAssessmentDto);
    const { clientId, userId, date, ...values } = createAssessmentDto;
    return this.prisma.$transaction(async (tx) => {
      const target = await this.resolveOwnedClient(
        clientId,
        userId,
        professionalId,
        tx,
      );
      await lockActiveOwnedClient(tx, target.clientId, professionalId);
      return tx.physicalAssessment.create({
        data: {
          ...values,
          ...(date ? { date: new Date(date) } : {}),
          clientId: target.clientId,
          userId: target.userId,
        },
      });
    });
  }

  async findByUser(userId: string, professionalId: string) {
    const target = await this.resolveOwnedClient(
      undefined,
      userId,
      professionalId,
    );

    return this.prisma.physicalAssessment.findMany({
      where: { clientId: target.clientId },
      orderBy: { date: 'asc' },
    });
  }

  async findByClient(clientId: string, professionalId: string) {
    await this.assertOwnedClient(clientId, professionalId);

    return this.prisma.physicalAssessment.findMany({
      where: { clientId },
      orderBy: { date: 'asc' },
    });
  }

  async remove(id: string, professionalId: string) {
    const assessment = await this.prisma.physicalAssessment.findFirst({
      where: {
        id,
        client: { professionalId },
      },
      select: { id: true },
    });

    if (!assessment) {
      throw new ForbiddenException('Avaliação indisponível');
    }

    return this.prisma.physicalAssessment.delete({ where: { id } });
  }

  findAll(professionalId: string) {
    return this.prisma.physicalAssessment.findMany({
      where: { client: { professionalId } },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  private async resolveOwnedClient(
    clientId: string | undefined,
    userId: string | undefined,
    professionalId: string,
    database: Pick<
      Prisma.TransactionClient,
      'client' | 'professionalPatientLink'
    > = this.prisma,
  ): Promise<{ clientId: string; userId: string | null }> {
    if (clientId) {
      const client = await database.client.findFirst({
        where: { id: clientId, professionalId },
        select: { id: true },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado');
      return { clientId: client.id, userId: null };
    }

    if (!userId) throw new NotFoundException('Cliente não encontrado');

    const legacyLink = await database.professionalPatientLink.findUnique({
      where: {
        professionalId_patientId: { professionalId, patientId: userId },
      },
      select: { id: true, isActive: true },
    });
    if (!legacyLink?.isActive) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const client = await database.client.findFirst({
      where: { id: legacyLink.id, professionalId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    return { clientId: client.id, userId: null };
  }

  private async assertOwnedClient(clientId: string, professionalId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, professionalId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
  }
}
