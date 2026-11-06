import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TrainingAnamnesis } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockOwnedClient } from '../../common/client-access/lock-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreateTrainingAnamnesisDto,
  ParqAnswersDto,
} from './dto/training-anamnesis.dto';

export type CanonicalParqAnswers = {
  heartCondition: boolean;
  chestPainActivity: boolean;
  chestPainRest: boolean;
  dizzinessOrSyncope: boolean;
  boneOrJointProblem: boolean;
  bloodPressureMedication: boolean;
  otherReason: boolean;
};

const PARQ_KEYS: readonly (keyof CanonicalParqAnswers)[] = [
  'heartCondition',
  'chestPainActivity',
  'chestPainRest',
  'dizzinessOrSyncope',
  'boneOrJointProblem',
  'bloodPressureMedication',
  'otherReason',
];

function normalizeParqAnswers(
  raw: ParqAnswersDto | Record<string, unknown>,
): CanonicalParqAnswers {
  const record = raw as Record<string, unknown>;
  return {
    heartCondition: Boolean(record.heartCondition),
    chestPainActivity: Boolean(record.chestPainActivity),
    chestPainRest: Boolean(record.chestPainRest),
    dizzinessOrSyncope: Boolean(record.dizzinessOrSyncope),
    boneOrJointProblem: Boolean(record.boneOrJointProblem),
    bloodPressureMedication: Boolean(record.bloodPressureMedication),
    otherReason: Boolean(record.otherReason),
  };
}

@Injectable()
export class TrainingAnamnesesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
  ) {}

  async listByClient(user: AuthUser, clientId: string) {
    this.assertPersonal(user);
    await this.access.getOwnedClient(user, clientId);
    const rows = await this.prisma.trainingAnamnesis.findMany({
      where: {
        clientId,
        professionalId: user.sub,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return rows.map((row) => this.project(row));
  }

  async create(user: AuthUser, dto: CreateTrainingAnamnesisDto) {
    this.assertPersonal(user);
    await this.access.getOwnedClient(user, dto.clientId);

    return this.prisma.$transaction(async (tx) => {
      await lockOwnedClient(tx, dto.clientId, user.sub);
      const client = await tx.client.findFirst({
        where: { id: dto.clientId, professionalId: user.sub },
        select: { status: true },
      });
      if (!client) {
        throw new NotFoundException('Cliente não encontrado.');
      }
      if (client.status === 'ARCHIVED') {
        throw new ConflictException({
          code: 'CLIENT_ARCHIVED',
          message:
            'Aluno arquivado não permite registrar nova anamnese de treinamento.',
        });
      }

      const parqAnswers = normalizeParqAnswers(dto.parqAnswers);
      const hasPositiveParq = PARQ_KEYS.some((key) => parqAnswers[key]);
      const availableEquipment = [...new Set(dto.availableEquipment)];

      const created = await tx.trainingAnamnesis.create({
        data: {
          clientId: dto.clientId,
          professionalId: user.sub,
          parqAnswers: parqAnswers as unknown as Prisma.InputJsonValue,
          hasPositiveParq,
          medicalClearanceNotes: dto.medicalClearanceNotes?.trim() || null,
          musculoskeletalHistory: dto.musculoskeletalHistory?.trim() || null,
          trainingExperience: dto.trainingExperience || null,
          daysPerWeek: dto.daysPerWeek ?? null,
          maxSessionMinutes: dto.maxSessionMinutes ?? null,
          environment: dto.environment,
          availableEquipment,
          notes: dto.notes?.trim() || null,
        },
      });

      return this.project(created);
    });
  }

  private project(row: TrainingAnamnesis) {
    const parqAnswers = normalizeParqAnswers(
      (row.parqAnswers ?? {}) as Record<string, unknown>,
    );
    return {
      id: row.id,
      clientId: row.clientId,
      parqAnswers,
      hasPositiveParq: row.hasPositiveParq,
      medicalClearanceNotes: row.medicalClearanceNotes,
      musculoskeletalHistory: row.musculoskeletalHistory,
      trainingExperience: row.trainingExperience,
      daysPerWeek: row.daysPerWeek,
      maxSessionMinutes: row.maxSessionMinutes,
      environment: row.environment,
      availableEquipment: row.availableEquipment,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private assertPersonal(user: AuthUser) {
    if (user.role !== 'PERSONAL') {
      throw new ForbiddenException(
        'Acesso permitido somente a personal trainer.',
      );
    }
  }
}
