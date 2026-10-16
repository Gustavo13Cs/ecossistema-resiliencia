import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';

const orderedSplitsInclude = {
  orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
  include: {
    exercises: {
      orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    },
  },
};

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, data: CreateWorkoutDto) {
    this.assertTrainingProfessional(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);
      await tx.workout.updateMany({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
        data: { isActive: false },
      });
      return tx.workout.create({
        data: {
          title: data.title,
          goal: data.goal,
          durationWeeks: data.durationWeeks,
          notes: data.notes,
          clientId: client.id,
          userId: null,
          creatorId: user.sub,
          isActive: true,
          splits: {
            create: data.splits.map((split, splitIndex) => ({
              name: split.name,
              focus: split.focus,
              position: splitIndex,
              exercises: {
                create: split.exercises.map((exercise, exerciseIndex) => ({
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  rest: exercise.rest,
                  notes: exercise.notes,
                  position: exerciseIndex,
                  muscleGroup: exercise.muscleGroup,
                  load: exercise.load,
                  effortType: exercise.effortType,
                  effortTarget: exercise.effortTarget,
                  tempo: exercise.tempo,
                  method: exercise.method ?? 'STANDARD',
                })),
              },
            })),
          },
        },
      });
    });
  }

  async findAllByProfessional(user: AuthUser) {
    this.assertTrainingProfessional(user);
    return this.prisma.workout.findMany({
      where: { creatorId: user.sub, client: { professionalId: user.sub } },
      include: { client: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(user: AuthUser, clientId: string) {
    this.assertTrainingProfessional(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.workout.findFirst({
      where: { clientId, creatorId: user.sub, isActive: true },
      include: { splits: orderedSplitsInclude },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(user: AuthUser, id: string) {
    const plan = await this.getOwnedPlan(user, id);
    return this.prisma.workout.delete({
      where: { id, creatorId: user.sub, clientId: plan.clientId },
    });
  }

  async saveAsTemplate(user: AuthUser, id: string) {
    const plan = await this.getOwnedPlan(user, id);
    return this.prisma.workout.update({
      where: { id, creatorId: user.sub, clientId: plan.clientId },
      data: { isTemplate: true },
      select: { id: true, title: true, isTemplate: true },
    });
  }

  async listTemplates(user: AuthUser) {
    this.assertTrainingProfessional(user);
    return this.prisma.workout.findMany({
      where: {
        creatorId: user.sub,
        isTemplate: true,
        OR: [{ clientId: null }, { client: { professionalId: user.sub } }],
      },
      include: { splits: orderedSplitsInclude },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async getOwnedPlan(user: AuthUser, id: string) {
    this.assertTrainingProfessional(user);
    const plan = await this.prisma.workout.findFirst({
      where: { id, creatorId: user.sub },
      select: { id: true, clientId: true, isTemplate: true },
    });
    if (!plan || (!plan.clientId && !plan.isTemplate)) {
      throw new NotFoundException('Treino nao encontrado');
    }
    if (plan.clientId)
      await this.clientAccess.getOwnedClient(user, plan.clientId);
    return plan;
  }

  private assertTrainingProfessional(user: AuthUser) {
    if (user.role !== 'PERSONAL')
      throw new ForbiddenException(
        'Acesso permitido somente a personal trainer',
      );
  }
}
