import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockOwnedClient } from '../../common/client-access/lock-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateRehabPlanDto } from './dto/create-rehab-plan.dto';

@Injectable()
export class RehabPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, data: CreateRehabPlanDto) {
    this.assertRehabilitationProfessional(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.$transaction(async (tx) => {
      await lockOwnedClient(tx, client.id, user.sub);
      await tx.rehabPlan.updateMany({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
        data: { isActive: false },
      });
      return tx.rehabPlan.create({
        data: {
          title: data.title,
          goal: data.goal,
          durationWeeks: data.durationWeeks,
          notes: data.notes,
          clientId: client.id,
          userId: null,
          creatorId: user.sub,
          isActive: true,
          sessions: {
            create: data.sessions.map((session) => ({
              name: session.name,
              focus: session.focus,
              exercises: {
                create: session.exercises.map((exercise) => ({
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  notes: exercise.notes,
                })),
              },
            })),
          },
        },
      });
    });
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
    return this.prisma.rehabPlan.findFirst({
      where: { clientId, creatorId: user.sub, isActive: true },
      include: { sessions: { include: { exercises: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

  async listTemplates(user: AuthUser) {
    this.assertRehabilitationProfessional(user);
    return this.prisma.rehabPlan.findMany({
      where: {
        creatorId: user.sub,
        isTemplate: true,
        OR: [{ clientId: null }, { client: { professionalId: user.sub } }],
      },
      include: { sessions: { include: { exercises: true } } },
      orderBy: { updatedAt: 'desc' },
    });
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
