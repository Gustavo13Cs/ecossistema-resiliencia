import { withWeekProjection } from './workout-week-projection';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { presentWorkout } from './exercise-demonstration';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  TrainingClientOverview,
  TrainingWorkspace,
  WorkoutDetail,
} from './training-read.types';

const activeWorkoutSelect = {
  id: true,
  clientId: true,
  title: true,
  goal: true,
  durationWeeks: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  finalizedAt: true,
  revisionOfId: true,
} satisfies Prisma.WorkoutSelect;

const assessmentSelect = {
  id: true,
  clientId: true,
  date: true,
  weight: true,
  bodyFat: true,
  muscleMass: true,
  waist: true,
  abdomen: true,
  hips: true,
  thorax: true,
  armLeft: true,
  armRight: true,
  thighLeft: true,
  thighRight: true,
  calfLeft: true,
  calfRight: true,
  skinfoldTriceps: true,
  skinfoldSubscapular: true,
  skinfoldChest: true,
  skinfoldAxillary: true,
  skinfoldSuprailiac: true,
  skinfoldAbdominal: true,
  skinfoldThigh: true,
  benchPress1RM: true,
  squat1RM: true,
  deadlift1RM: true,
  vo2Max: true,
  notes: true,
} satisfies Prisma.PhysicalAssessmentSelect;

export const workoutDetailSelect = {
  ...activeWorkoutSelect,
  notes: true,
  periodization: true,
  weeklyVolumeSnapshot: true,
  isTemplate: true,
  client: { select: { id: true, name: true, status: true } },
  splits: {
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      focus: true,
      weeklyFrequency: true,
      position: true,
      exercises: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          sets: true,
          reps: true,
          rest: true,
          notes: true,
          position: true,
          muscleGroup: true,
          secondaryMuscles: true,
          load: true,
          effortType: true,
          effortTarget: true,
          tempo: true,
          method: true,
          librarySource: true,
          libraryExerciseId: true,
          demonstrationSnapshot: true,
        },
      },
    },
  },
} satisfies Prisma.WorkoutSelect;

@Injectable()
export class TrainingReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async getWorkspace(user: AuthUser): Promise<TrainingWorkspace> {
    this.assertTrainingProfessional(user);
    const activeClients = {
      professionalId: user.sub,
      status: 'ACTIVE',
    } satisfies Prisma.ClientWhereInput;
    const withoutActiveWorkout = {
      ...activeClients,
      workouts: { none: { creatorId: user.sub, isActive: true } },
    } satisfies Prisma.ClientWhereInput;
    const preview = {
      select: { id: true, name: true, goal: true, updatedAt: true },
      take: 5,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    } satisfies Prisma.ClientFindManyArgs;
    const [
      activeStudents,
      archivedStudents,
      withoutWorkoutCount,
      recent,
      withoutWorkout,
    ] = await Promise.all([
      this.prisma.client.count({ where: activeClients }),
      this.prisma.client.count({
        where: { professionalId: user.sub, status: 'ARCHIVED' },
      }),
      this.prisma.client.count({ where: withoutActiveWorkout }),
      this.prisma.client.findMany({ ...preview, where: activeClients }),
      this.prisma.client.findMany({ ...preview, where: withoutActiveWorkout }),
    ]);
    return {
      counts: {
        activeStudents,
        archivedStudents,
        withoutActiveWorkout: withoutWorkoutCount,
      },
      items: [
        ...withoutWorkout.map(({ id, name, goal, updatedAt }) => ({
          clientId: id,
          name,
          goal,
          updatedAt,
          section: 'WITHOUT_ACTIVE_WORKOUT' as const,
        })),
        ...recent.map(({ id, name, goal, updatedAt }) => ({
          clientId: id,
          name,
          goal,
          updatedAt,
          section: 'RECENT' as const,
        })),
      ],
    };
  }

  async getClientOverview(
    user: AuthUser,
    clientId: string,
  ): Promise<TrainingClientOverview> {
    this.assertTrainingProfessional(user);
    const client = await this.clientAccess.getOwnedClient(user, clientId);
    const [activeWorkout, recentAssessments] = await Promise.all([
      this.prisma.workout.findFirst({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
        select: activeWorkoutSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.physicalAssessment.findMany({
        where: { clientId: client.id, client: { professionalId: user.sub } },
        select: assessmentSelect,
        take: 2,
        orderBy: [{ date: 'desc' }, { id: 'asc' }],
      }),
    ]);
    return {
      client: { id: client.id, status: client.status },
      activeWorkout: activeWorkout
        ? { ...activeWorkout, clientId: client.id }
        : null,
      recentAssessments: recentAssessments.map((assessment) => ({
        ...assessment,
        clientId: client.id,
      })),
    };
  }

  async getWorkout(
    user: AuthUser,
    workoutId: string,
    week?: number,
  ): Promise<WorkoutDetail> {
    this.assertTrainingProfessional(user);
    const plan = await this.prisma.workout.findFirst({
      where: {
        id: workoutId,
        creatorId: user.sub,
        client: { professionalId: user.sub },
      },
      select: { id: true, clientId: true },
    });
    if (!plan?.clientId) throw new NotFoundException('Treino não encontrado');
    const client = await this.clientAccess.getOwnedClient(user, plan.clientId);
    const detail = await this.prisma.workout.findFirst({
      where: {
        id: workoutId,
        clientId: client.id,
        creatorId: user.sub,
        client: { professionalId: user.sub },
      },
      select: workoutDetailSelect,
    });
    if (
      !detail ||
      detail.clientId !== client.id ||
      detail.client?.id !== client.id
    ) {
      throw new NotFoundException('Treino não encontrado');
    }
    return withWeekProjection(
      presentWorkout({
        ...detail,
        clientId: client.id,
        client: detail.client,
      }),
      week,
    );
  }

  private assertTrainingProfessional(user: AuthUser) {
    if (user.role !== 'PERSONAL') {
      throw new ForbiddenException(
        'Acesso permitido somente a personal trainer',
      );
    }
  }
}
