import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreatePhysioAssessmentDto } from './dto/create-physio-assessment.dto';

@Injectable()
export class PhysioAssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, data: CreatePhysioAssessmentDto) {
    this.assertPhysiotherapist(user);
    if (data.goniometry) {
      for (const entry of data.goniometry) {
        if (entry.activeDeg == null && entry.passiveDeg == null) {
          throw new BadRequestException(
            `Informe graus ativos ou passivos para goniometria de ${entry.joint} (${entry.movement}).`,
          );
        }
      }
    }

    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);
      return tx.physioAssessment.create({
        data: {
          clientId: client.id,
          creatorId: user.sub,
          userId: null,
          chiefComplaint: data.chiefComplaint,
          historyOfIllness: data.historyOfIllness,
          painLevel: data.painLevel,
          posturalAnalysis: data.posturalAnalysis,
          palpation: data.palpation,
          jointMobility: data.jointMobility,
          orthopedicTests: data.orthopedicTests,
          treatmentPlan: data.treatmentPlan,
          ...(data.bodyPainMap !== undefined && {
            bodyPainMap: data.bodyPainMap as unknown as Prisma.InputJsonValue,
          }),
          ...(data.goniometry !== undefined && {
            goniometry: data.goniometry as unknown as Prisma.InputJsonValue,
          }),
          ...(data.muscleStrength !== undefined && {
            muscleStrength:
              data.muscleStrength as unknown as Prisma.InputJsonValue,
          }),
          ...(data.orthopedicTestItems !== undefined && {
            orthopedicTestItems:
              data.orthopedicTestItems as unknown as Prisma.InputJsonValue,
          }),
        },
      });
    });
  }

  async findAllByProfessional(user: AuthUser) {
    this.assertPhysiotherapist(user);
    return this.prisma.physioAssessment.findMany({
      where: { creatorId: user.sub, client: { professionalId: user.sub } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findByClient(user: AuthUser, clientId: string) {
    this.assertPhysiotherapist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.physioAssessment.findMany({
      where: { clientId, creatorId: user.sub },
      orderBy: { date: 'desc' },
    });
  }

  async remove(user: AuthUser, id: string) {
    this.assertPhysiotherapist(user);
    const assessment = await this.prisma.physioAssessment.findFirst({
      where: { id, creatorId: user.sub },
      select: { clientId: true },
    });
    if (!assessment?.clientId)
      throw new NotFoundException('Avaliação não encontrada');
    await this.clientAccess.getOwnedClient(user, assessment.clientId);
    return this.prisma.physioAssessment.delete({
      where: { id, clientId: assessment.clientId, creatorId: user.sub },
    });
  }

  private assertPhysiotherapist(user: AuthUser) {
    if (user.role !== 'PHYSIO')
      throw new ForbiddenException('Acesso permitido somente a fisioterapeuta');
  }
}
