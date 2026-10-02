import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

export const ALERT_SNAPSHOT_LOCK = 0x534146454d4f5645n;
const DAY = 86_400_000;

@Injectable()
export class AlertsCronService {
  private readonly logger = new Logger(AlertsCronService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyAlerts(
    now = new Date(),
  ): Promise<{ generated: number; skipped: boolean }> {
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ALERT_SNAPSHOT_LOCK}::bigint)`;
          // As regras de treino são aplicadas somente aos prontuários ativos de personal.
          const clients = await tx.client.findMany({
            where: { status: 'ACTIVE', professional: { role: 'PERSONAL' } },
            select: { id: true, professionalId: true },
          });
          const alerts: Prisma.PatientAlertCreateManyInput[] = [];
          const fiveDaysAgo = new Date(now.getTime() - 5 * DAY);
          const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY);
          const twentyOneDaysAgo = new Date(now.getTime() - 21 * DAY);
          for (const client of clients) {
            const where = {
              professionalId: client.professionalId,
              clientId: client.id,
              type: 'WORKOUT',
            };
            const recent = await tx.dailyTracking.findMany({
              where: {
                ...where,
                completedAt: { gte: twentyOneDaysAgo, lte: now },
              },
              select: { completedAt: true },
              orderBy: { completedAt: 'desc' },
            });
            const past = await tx.dailyTracking.findFirst({
              where: { ...where, completedAt: { lt: twentyOneDaysAgo } },
              select: { id: true },
            });
            const identity = {
              clientId: client.id,
              professionalId: client.professionalId,
              patientId: null,
              createdAt: now,
            };
            if (!recent[0] || recent[0].completedAt < fiveDaysAgo) {
              alerts.push({
                ...identity,
                type: 'INACTIVE_5_DAYS',
                severity: 'HIGH',
                message: 'Nenhum treino registrado nos últimos 5 dias.',
              });
            }
            const days = new Map<string, number>();
            for (const workout of recent) {
              if (workout.completedAt < fourteenDaysAgo) continue;
              const day = workout.completedAt.toISOString().slice(0, 10);
              days.set(day, (days.get(day) ?? 0) + 1);
            }
            const overloadedDays = [...days.values()].filter(
              (count) => count > 1,
            ).length;
            if (overloadedDays >= 3) {
              alerts.push({
                ...identity,
                type: 'OVERTRAINING_RISK',
                severity: 'HIGH',
                message: `Múltiplos treinos no mesmo dia detectados em ${overloadedDays} dias nas últimas 2 semanas. Risco de overtraining.`,
              });
            }
            if (recent.length === 0 && past) {
              alerts.push({
                ...identity,
                type: 'PLATEAU_3_WEEKS',
                severity: 'MEDIUM',
                message:
                  'Nenhum treino registrado nas últimas 3 semanas. Possível abandono do plano.',
              });
            }
          }
          // Somente o snapshot Client é substituído; o histórico legado fica preservado.
          await tx.patientAlert.deleteMany({
            where: { clientId: { not: null } },
          });
          if (alerts.length) await tx.patientAlert.createMany({ data: alerts });
          return { generated: alerts.length, skipped: false };
        },
        { maxWait: 30_000, timeout: 60_000 },
      );
      this.logger.log(result);
      return result;
    } catch {
      this.logger.error({ generated: 0, skipped: false });
      throw new Error('Alert snapshot generation failed');
    }
  }
}
