import { summarizeWeeklyVolume } from './workout-volume';
import { validatePeriodization } from './workout-periodization';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import {
  ExerciseDemonstrationService,
  ResolvedWorkoutDemonstrations,
} from './exercise-demonstration.service';
import { DraftContentV2 } from './workout-draft.types';
import { presentWorkout } from './exercise-demonstration';
import { workoutDetailSelect } from './training-read.service';
import { WorkoutDetail } from './training-read.types';

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
    private readonly demonstrations: ExerciseDemonstrationService = new ExerciseDemonstrationService(
      prisma,
    ),
  ) {}

  async create(user: AuthUser, data: CreateWorkoutDto) {
    this.assertTrainingProfessional(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.$transaction(async (tx) => {
      const resolved = await this.demonstrations.resolveWorkoutDemonstrations(
        user,
        data,
      );
      return presentWorkout(
        await this.writeFinalizedWorkout(
          tx,
          user,
          client.id,
          data,
          null,
          resolved,
        ),
      );
    });
  }

  async createFromDraft(
    user: AuthUser,
    data: CreateWorkoutDto,
    revisionOfId: string | null,
    savedContent?: DraftContentV2,
  ): Promise<WorkoutDetail> {
    this.assertTrainingProfessional(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.$transaction(async (tx) => {
      const workout = await this.writeFinalizedWorkout(
        tx,
        user,
        client.id,
        data,
        revisionOfId,
        savedContent ??
          (await this.demonstrations.resolveWorkoutDemonstrations(user, data)),
      );
      const detail = await tx.workout.findFirstOrThrow({
        where: {
          id: workout.id,
          clientId: client.id,
          creatorId: user.sub,
          client: { professionalId: user.sub },
        },
        select: workoutDetailSelect,
      });
      if (
        !detail.client ||
        detail.clientId !== client.id ||
        detail.client.id !== client.id
      ) {
        throw new NotFoundException('Treino não encontrado');
      }
      return presentWorkout({
        ...detail,
        clientId: client.id,
        client: detail.client,
      });
    });
  }

  private async writeFinalizedWorkout(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    clientId: string,
    data: CreateWorkoutDto,
    revisionOfId: string | null,
    resolved: ResolvedWorkoutDemonstrations,
  ) {
    const periodErrors = validatePeriodization(
      data.periodization,
      data.durationWeeks,
      true,
    );
    if (periodErrors.length) throw new BadRequestException(periodErrors);
    await lockActiveOwnedClient(tx, clientId, user.sub);
    if (revisionOfId !== null) {
      const source = await tx.workout.findFirst({
        where: {
          id: revisionOfId,
          clientId,
          creatorId: user.sub,
          client: { professionalId: user.sub },
        },
        select: { id: true },
      });
      if (!source)
        throw new NotFoundException('Treino de origem não encontrado');
    }
    await tx.workout.updateMany({
      where: { clientId, creatorId: user.sub, isActive: true },
      data: { isActive: false },
    });
    return tx.workout.create({
      include: { splits: orderedSplitsInclude },
      data: {
        periodization: data.periodization
          ? (data.periodization as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
        weeklyVolumeSnapshot: summarizeWeeklyVolume(
          data.splits,
        ) as unknown as Prisma.InputJsonValue,
        title: data.title,
        goal: data.goal,
        durationWeeks: data.durationWeeks,
        notes: data.notes,
        clientId,
        userId: null,
        creatorId: user.sub,
        isActive: true,
        finalizedAt: new Date(),
        revisionOfId,
        splits: {
          create: data.splits.map((split, splitIndex) => ({
            weeklyFrequency: split.weeklyFrequency ?? null,
            name: split.name,
            focus: split.focus,
            position: splitIndex,
            exercises: {
              create: split.exercises.map((exercise, exerciseIndex) => ({
                librarySource:
                  resolved.splits[splitIndex].exercises[exerciseIndex]
                    .libraryReference?.source ?? null,
                libraryExerciseId:
                  resolved.splits[splitIndex].exercises[exerciseIndex]
                    .libraryReference?.exerciseId ?? null,
                demonstrationSnapshot:
                  (resolved.splits[splitIndex].exercises[exerciseIndex]
                    .demonstrationSnapshot as Prisma.InputJsonValue | null) ??
                  Prisma.DbNull,
                secondaryMuscles: exercise.secondaryMuscles
                  ? (exercise.secondaryMuscles as unknown as Prisma.InputJsonValue)
                  : Prisma.DbNull,
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
    const workout = await this.prisma.workout.findFirst({
      where: { clientId, creatorId: user.sub, isActive: true },
      include: { splits: orderedSplitsInclude },
      orderBy: { createdAt: 'desc' },
    });
    return workout ? presentWorkout(workout) : null;
  }

  async remove(user: AuthUser, id: string) {
    const plan = await this.getOwnedPlan(user, id);
    if (plan.clientId) {
      throw new ConflictException(
        'Prescrições vinculadas a alunos devem ser preservadas no histórico',
      );
    }
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
    const templates = await this.prisma.workout.findMany({
      where: {
        creatorId: user.sub,
        isTemplate: true,
        OR: [{ clientId: null }, { client: { professionalId: user.sub } }],
      },
      include: { splits: orderedSplitsInclude },
      orderBy: { updatedAt: 'desc' },
    });
    return templates.map((template) => presentWorkout(template));
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
