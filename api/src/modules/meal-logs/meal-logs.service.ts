import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateMealLogDto } from './dto/create-meal-log.dto';

@Injectable()
export class MealLogsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, dto: CreateMealLogDto) {
    // Verifica se a refeição pertence a uma dieta do paciente
    const meal = await this.prisma.meal.findUnique({
      where: { id: dto.mealId },
      include: { dietPlan: { select: { userId: true } } },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada');
    if (meal.dietPlan.userId !== patientId) throw new ForbiddenException('Acesso negado');

    const log = await this.prisma.mealLog.create({
      data: {
        mealId: dto.mealId,
        patientId,
        status: dto.status,
        notes: dto.notes,
      },
      include: { meal: { select: { name: true } } },
    });

    // Registra no DailyTracking somente se a refeição foi feita (seguiu ou substituiu)
    if (dto.status !== 'SKIPPED') {
      await this.prisma.dailyTracking.create({
        data: {
          patientId,
          type: 'MEAL',
          itemName: log.meal.name,
        },
      });
    }

    return log;
  }

  async findByPatient(patientId: string, requesterId: string, requesterRole: string) {
    if (requesterRole === 'PATIENT' && patientId !== requesterId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (requesterRole === 'NUTRITIONIST') {
      const link = await this.prisma.professionalPatientLink.findUnique({
        where: {
          professionalId_patientId: { professionalId: requesterId, patientId },
        },
      });
      if (!link || !link.isActive) throw new ForbiddenException('Paciente não vinculado');
    }

    return this.prisma.mealLog.findMany({
      where: { patientId },
      orderBy: { loggedAt: 'desc' },
      take: 60, // últimos 60 logs (cobre ~2 semanas com 4 refeições/dia)
      include: {
        meal: { select: { name: true, time: true } },
      },
    });
  }

  // Taxa de adesão por refeição — para o painel do nutricionista
  async getMealStats(mealId: string, requesterId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: { dietPlan: { select: { creatorId: true } } },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada');
    if (meal.dietPlan.creatorId !== requesterId) throw new ForbiddenException('Acesso negado');

    const logs = await this.prisma.mealLog.findMany({ where: { mealId } });
    const total = logs.length;

    if (total === 0) return { total: 0, followed: 0, substituted: 0, skipped: 0 };

    const followed = logs.filter((l) => l.status === 'FOLLOWED').length;
    const substituted = logs.filter((l) => l.status === 'SUBSTITUTED').length;
    const skipped = logs.filter((l) => l.status === 'SKIPPED').length;

    return {
      total,
      followed: Math.round((followed / total) * 100),
      substituted: Math.round((substituted / total) * 100),
      skipped: Math.round((skipped / total) * 100),
    };
  }
}
