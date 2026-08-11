import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class AlertsCronService {
  private readonly logger = new Logger(AlertsCronService.name);

  constructor(private prisma: PrismaService) {}

  // Roda todos os dias às 02:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyAlerts() {
    this.logger.log('Iniciando processamento analítico de alertas...');

    // 1. Limpa os alertas do dia anterior para não acumular
    await this.prisma.patientAlert.deleteMany({});

    // 2. Busca pacientes vinculados a profissionais ativos
    const links = await this.prisma.professionalPatientLink.findMany({
      where: { isActive: true },
      select: { professionalId: true, patientId: true },
    });

    const alertsToInsert: any[] = [];
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    for (const link of links) {
      // ─────────────────────────────────────────────────────────────────────
      // REGRA 1: Inatividade — sem treino registrado nos últimos 5 dias
      // Fonte de dados: DailyTracking com type = 'WORKOUT'
      // ─────────────────────────────────────────────────────────────────────
      const lastWorkout = await this.prisma.dailyTracking.findFirst({
        where: {
          patientId: link.patientId,
          type: 'WORKOUT',
        },
        orderBy: { completedAt: 'desc' },
      });

      if (!lastWorkout || lastWorkout.completedAt < fiveDaysAgo) {
        alertsToInsert.push({
          type: 'INACTIVE_5_DAYS',
          severity: 'HIGH',
          message: 'Nenhum treino registrado nos últimos 5 dias.',
          patientId: link.patientId,
          professionalId: link.professionalId,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // REGRA 2: Risco de Overtraining — mais de 2 treinos por dia em
      // pelo menos 3 dias distintos nas últimas 2 semanas.
      // Fonte de dados: DailyTracking com type = 'WORKOUT'
      // ─────────────────────────────────────────────────────────────────────
      const recentWorkouts = await this.prisma.dailyTracking.findMany({
        where: {
          patientId: link.patientId,
          type: 'WORKOUT',
          completedAt: { gte: fourteenDaysAgo },
        },
        select: { completedAt: true },
      });

      // Agrupa treinos por dia (YYYY-MM-DD) e conta quantos dias tiveram > 1 treino
      const workoutsByDay = recentWorkouts.reduce<Record<string, number>>(
        (acc, w) => {
          const day = w.completedAt.toISOString().split('T')[0];
          acc[day] = (acc[day] ?? 0) + 1;
          return acc;
        },
        {},
      );

      const overloadedDays = Object.values(workoutsByDay).filter(
        (count) => count > 1,
      ).length;

      if (overloadedDays >= 3) {
        alertsToInsert.push({
          type: 'OVERTRAINING_RISK',
          severity: 'HIGH',
          message: `Múltiplos treinos no mesmo dia detectados em ${overloadedDays} dias nas últimas 2 semanas. Risco de overtraining.`,
          patientId: link.patientId,
          professionalId: link.professionalId,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // REGRA 3: Platô de volume — sem nenhum treino nas últimas 3 semanas
      // mas havia treinos antes disso (paciente ativo que parou).
      // ─────────────────────────────────────────────────────────────────────
      const twentyOneDaysAgo = new Date();
      twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

      const recentActivity = await this.prisma.dailyTracking.count({
        where: {
          patientId: link.patientId,
          type: 'WORKOUT',
          completedAt: { gte: twentyOneDaysAgo },
        },
      });

      const anyPastActivity = await this.prisma.dailyTracking.count({
        where: {
          patientId: link.patientId,
          type: 'WORKOUT',
          completedAt: { lt: twentyOneDaysAgo },
        },
      });

      if (recentActivity === 0 && anyPastActivity > 0) {
        alertsToInsert.push({
          type: 'PLATEAU_3_WEEKS',
          severity: 'MEDIUM',
          message:
            'Nenhum treino registrado nas últimas 3 semanas. Possível abandono do plano.',
          patientId: link.patientId,
          professionalId: link.professionalId,
        });
      }
    }

    if (alertsToInsert.length > 0) {
      await this.prisma.patientAlert.createMany({ data: alertsToInsert });
    }

    this.logger.log(
      `Processamento concluído. ${alertsToInsert.length} alertas gerados.`,
    );
  }
}