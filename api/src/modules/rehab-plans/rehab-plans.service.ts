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
import {
  CreateRehabPlanDto,
  CreateRehabSessionDto,
} from './dto/create-rehab-plan.dto';
import {
  CreateRehabTemplateDto,
  PhysioExerciseCatalogQueryDto,
  UpdateRehabPhaseDto,
  UpdateRehabPlanDto,
} from './dto/update-rehab-plan.dto';
import {
  listPhysioExerciseCatalog,
  presentRehabPlan,
  resolveRehabCatalogSnapshot,
  SAFEMOVE_REHAB_PROTOCOLS,
} from './rehab-protocol-catalog';

const REHAB_PLAN_DETAIL_INCLUDE = {
  sessions: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    include: {
      exercises: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
      },
    },
  },
} satisfies Prisma.RehabPlanInclude;

@Injectable()
export class RehabPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, data: CreateRehabPlanDto) {
    this.assertRehabilitationProfessional(user);
    const currentPhaseIndex = this.normalizePhaseIndex(
      data.currentPhaseIndex,
      data.sessions.length,
    );
    const sessionsCreate = this.buildSessionsCreateInput(data.sessions);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    const created = await this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);
      await tx.rehabPlan.updateMany({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
        data: { isActive: false },
      });
      return tx.rehabPlan.create({
        data: {
          title: data.title,
          goal: data.goal,
          durationWeeks: data.durationWeeks,
          currentPhaseIndex,
          notes: data.notes,
          clientId: client.id,
          userId: null,
          creatorId: user.sub,
          isActive: true,
          sessions: {
            create: sessionsCreate,
          },
        },
        include: REHAB_PLAN_DETAIL_INCLUDE,
      });
    });
    return presentRehabPlan(created);
  }

  async update(user: AuthUser, id: string, data: UpdateRehabPlanDto) {
    this.assertRehabilitationProfessional(user);
    const currentPhaseIndex = this.normalizePhaseIndex(
      data.currentPhaseIndex,
      data.sessions.length,
    );
    const sessionsCreate = this.buildSessionsCreateInput(data.sessions);
    const existing = await this.getOwnedPlan(user, id);
    if (!existing.clientId && !existing.isTemplate) {
      throw new NotFoundException('Plano de reabilitação não encontrado');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (existing.clientId) {
        await lockActiveOwnedClient(tx, existing.clientId, user.sub);
      }
      await tx.rehabSession.deleteMany({
        where: { rehabPlanId: id },
      });
      return tx.rehabPlan.update({
        where: { id, creatorId: user.sub, clientId: existing.clientId },
        data: {
          title: data.title,
          goal: data.goal ?? null,
          durationWeeks: data.durationWeeks ?? null,
          currentPhaseIndex,
          notes: data.notes ?? null,
          sessions: {
            create: sessionsCreate,
          },
        },
        include: REHAB_PLAN_DETAIL_INCLUDE,
      });
    });
    return presentRehabPlan(updated);
  }

  async updateCurrentPhase(
    user: AuthUser,
    id: string,
    dto: UpdateRehabPhaseDto,
  ) {
    this.assertRehabilitationProfessional(user);
    const existing = await this.getOwnedPlan(user, id);
    if (!existing.clientId) {
      throw new NotFoundException('Plano de reabilitação não encontrado');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId!, user.sub);
      const sessionCount = await tx.rehabSession.count({
        where: { rehabPlanId: id },
      });
      if (dto.currentPhaseIndex < 0 || dto.currentPhaseIndex >= sessionCount) {
        throw new BadRequestException(
          'Índice da fase atual inválido para este protocolo.',
        );
      }
      return tx.rehabPlan.update({
        where: { id, creatorId: user.sub, clientId: existing.clientId },
        data: { currentPhaseIndex: dto.currentPhaseIndex },
        include: REHAB_PLAN_DETAIL_INCLUDE,
      });
    });
    return presentRehabPlan(updated);
  }

  async findAllByProfessional(user: AuthUser) {
    this.assertRehabilitationProfessional(user);
    return this.prisma.rehabPlan.findMany({
      where: { creatorId: user.sub, client: { professionalId: user.sub } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(user: AuthUser, clientId: string) {
    this.assertRehabilitationProfessional(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    const plan = await this.prisma.rehabPlan.findFirst({
      where: { clientId, creatorId: user.sub, isActive: true },
      include: REHAB_PLAN_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return plan ? presentRehabPlan(plan) : null;
  }

  async remove(user: AuthUser, id: string) {
    const plan = await this.getOwnedPlan(user, id);
    return this.prisma.rehabPlan.delete({
      where: { id, creatorId: user.sub, clientId: plan.clientId },
    });
  }

  async saveAsTemplate(user: AuthUser, id: string) {
    const plan = await this.getOwnedPlan(user, id);
    return this.prisma.rehabPlan.update({
      where: { id, creatorId: user.sub, clientId: plan.clientId },
      data: { isTemplate: true },
      select: { id: true, title: true, isTemplate: true },
    });
  }

  async createTemplate(user: AuthUser, data: CreateRehabTemplateDto) {
    this.assertRehabilitationProfessional(user);
    const currentPhaseIndex = this.normalizePhaseIndex(
      data.currentPhaseIndex,
      data.sessions.length,
    );
    const sessionsCreate = this.buildSessionsCreateInput(data.sessions);
    const created = await this.prisma.rehabPlan.create({
      data: {
        title: data.title,
        goal: data.goal,
        durationWeeks: data.durationWeeks,
        currentPhaseIndex,
        notes: data.notes,
        clientId: null,
        userId: null,
        creatorId: user.sub,
        isActive: false,
        isTemplate: true,
        sessions: {
          create: sessionsCreate,
        },
      },
      include: REHAB_PLAN_DETAIL_INCLUDE,
    });
    return presentRehabPlan(created);
  }

  async listTemplates(user: AuthUser) {
    this.assertRehabilitationProfessional(user);
    const templates = await this.prisma.rehabPlan.findMany({
      where: {
        creatorId: user.sub,
        isTemplate: true,
        OR: [{ clientId: null }, { client: { professionalId: user.sub } }],
      },
      include: REHAB_PLAN_DETAIL_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return templates.map((template) => presentRehabPlan(template));
  }

  getProtocolCatalog(user: AuthUser) {
    this.assertRehabilitationProfessional(user);
    return SAFEMOVE_REHAB_PROTOCOLS.map((protocol) => ({
      ...protocol,
      sessions: protocol.sessions.map((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => {
          const resolved = resolveRehabCatalogSnapshot(
            exercise.catalogExerciseId,
          );
          return presentRehabPlan({
            sessions: [
              {
                exercises: [
                  {
                    ...exercise,
                    demonstrationSnapshot: resolved.snapshot,
                  },
                ],
              },
            ],
          }).sessions[0].exercises[0];
        }),
      })),
    }));
  }

  getExerciseCatalog(
    user: AuthUser,
    query: PhysioExerciseCatalogQueryDto = {},
  ) {
    this.assertRehabilitationProfessional(user);
    return listPhysioExerciseCatalog(query);
  }

  private normalizePhaseIndex(
    currentPhaseIndex: number | undefined,
    sessionCount: number,
  ): number {
    const index = currentPhaseIndex ?? 0;
    if (index < 0 || index >= sessionCount) {
      throw new BadRequestException(
        'Índice da fase atual inválido para a quantidade de fases do protocolo.',
      );
    }
    return index;
  }

  private buildSessionsCreateInput(sessions: CreateRehabSessionDto[]) {
    return sessions.map((session, sessionIndex) => ({
      name: session.name,
      focus: session.focus,
      position: sessionIndex,
      ...(session.progressionCriteria !== undefined
        ? { progressionCriteria: session.progressionCriteria }
        : {}),
      ...(session.estimatedWeeks !== undefined
        ? { estimatedWeeks: session.estimatedWeeks }
        : {}),
      exercises: {
        create: session.exercises.map((exercise, exerciseIndex) => {
          const resolved = resolveRehabCatalogSnapshot(
            exercise.catalogExerciseId,
          );
          if (!resolved.found) {
            throw new BadRequestException(
              `Exercício do catálogo não encontrado: ${exercise.catalogExerciseId}`,
            );
          }
          return {
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: exercise.notes,
            position: exerciseIndex,
            ...(exercise.category !== undefined
              ? { category: exercise.category }
              : {}),
            ...(exercise.modalityParams !== undefined
              ? {
                  modalityParams:
                    exercise.modalityParams as unknown as Prisma.InputJsonValue,
                }
              : {}),
            ...(exercise.isHomeExercise !== undefined
              ? { isHomeExercise: exercise.isHomeExercise }
              : {}),
            ...(exercise.homeFrequency !== undefined
              ? { homeFrequency: exercise.homeFrequency }
              : {}),
            ...(exercise.patientInstructions !== undefined
              ? { patientInstructions: exercise.patientInstructions }
              : {}),
            ...(exercise.catalogExerciseId !== undefined
              ? { catalogExerciseId: exercise.catalogExerciseId }
              : {}),
            ...(resolved.snapshot
              ? {
                  demonstrationSnapshot:
                    resolved.snapshot as unknown as Prisma.InputJsonValue,
                }
              : {}),
          };
        }),
      },
    }));
  }

  private async getOwnedPlan(user: AuthUser, id: string) {
    this.assertRehabilitationProfessional(user);
    const plan = await this.prisma.rehabPlan.findFirst({
      where: { id, creatorId: user.sub },
      select: { id: true, clientId: true, isTemplate: true },
    });
    if (!plan || (!plan.clientId && !plan.isTemplate)) {
      throw new NotFoundException('Plano de reabilitação não encontrado');
    }
    if (plan.clientId)
      await this.clientAccess.getOwnedClient(user, plan.clientId);
    return plan;
  }

  private assertRehabilitationProfessional(user: AuthUser) {
    if (user.role !== 'PHYSIO')
      throw new ForbiddenException('Acesso permitido somente a fisioterapeuta');
  }
}
