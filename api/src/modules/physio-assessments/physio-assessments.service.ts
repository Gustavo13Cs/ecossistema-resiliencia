import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
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
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.physioAssessment.create({
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
      },
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
