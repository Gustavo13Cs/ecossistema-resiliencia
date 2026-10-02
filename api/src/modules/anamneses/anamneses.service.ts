import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';

@Injectable()
export class AnamnesesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, dto: CreateAnamnesisDto) {
    this.assertNutritionist(user);
    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    return this.prisma.anamnesis.create({
      data: {
        clientId: client.id,
        creatorId: user.sub,
        patientId: null,
        clinicalHistory: dto.clinicalHistory,
        medications: dto.medications,
        pathologies: dto.pathologies,
        bowelMovement: dto.bowelMovement,
        bristolScale: dto.bristolScale,
        urineColor: dto.urineColor,
        symptoms: dto.symptoms,
        familyHistory: dto.familyHistory,
        waterIntake: dto.waterIntake,
        alcoholAndSmoking: dto.alcoholAndSmoking,
      },
    });
  }

  async findByClient(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.anamnesis.findMany({
      where: { clientId, creatorId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { name: true } } },
    });
  }

  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
