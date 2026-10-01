import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientGoal, Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { UpsertClientGoalDto } from './dto/upsert-client-goal.dto';

function serializeGoal<T extends ClientGoal>(row: T) {
  const {
    waterTargetMl,
    sleepTargetHours,
    mealsAdherencePercent,
    dailyStepsTarget,
    habitsNotes,
    ...goal
  } = row;
  return {
    ...goal,
    habits: {
      waterTargetMl,
      sleepTargetHours,
      mealsAdherencePercent,
      dailyStepsTarget,
      habitsNotes,
    },
  };
}

@Injectable()
export class ClientGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async list(user: AuthUser) {
    this.assertNutritionist(user);
    const goals = await this.prisma.clientGoal.findMany({
      where: { professionalId: user.sub, client: { professionalId: user.sub } },
      orderBy: { updatedAt: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    });
    return goals.map(serializeGoal);
  }

  async findOne(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    const goal = await this.prisma.clientGoal.findFirst({
      where: { clientId, professionalId: user.sub },
    });
    return goal ? serializeGoal(goal) : null;
  }

  async upsert(user: AuthUser, clientId: string, dto: UpsertClientGoalDto) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    const startDate = new Date(dto.startDate);
    const targetDate = new Date(dto.targetDate);
    if (targetDate < startDate)
      throw new BadRequestException(
        'A data alvo deve ser igual ou posterior à data inicial',
      );
    const data = {
      category: dto.category,
      status: dto.status ?? 'PENDING',
      startDate,
      targetDate,
      targetWeightKg: dto.targetWeightKg ?? null,
      targetBodyFatPercent: dto.targetBodyFatPercent ?? null,
      targetMuscleMassKg: dto.targetMuscleMassKg ?? null,
      startWeightKg: dto.startWeightKg ?? null,
      startBodyFatPercent: dto.startBodyFatPercent ?? null,
      waterTargetMl: dto.habits.waterTargetMl,
      sleepTargetHours: dto.habits.sleepTargetHours,
      mealsAdherencePercent: dto.habits.mealsAdherencePercent,
      dailyStepsTarget: dto.habits.dailyStepsTarget,
      habitsNotes: dto.habits.habitsNotes ?? null,
      clinicalNotes: dto.clinicalNotes ?? null,
    } satisfies Prisma.ClientGoalUncheckedUpdateInput;
    try {
      const goal = await this.prisma.clientGoal.upsert({
        where: { clientId, professionalId: user.sub },
        create: { ...data, clientId, professionalId: user.sub },
        update: data,
      });
      return serializeGoal(goal);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new NotFoundException('Meta não encontrada');
      throw error;
    }
  }

  async remove(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    const { count } = await this.prisma.clientGoal.deleteMany({
      where: { clientId, professionalId: user.sub },
    });
    if (!count) throw new NotFoundException('Meta não encontrada');
    return { deleted: true };
  }

  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
