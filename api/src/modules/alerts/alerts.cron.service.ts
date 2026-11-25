import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { JobsPrismaService } from '../../infra/database/database-clients';
import { alertsCronDisabled } from './alerts-cron-config';

export const ALERT_SNAPSHOT_LOCK = 0x534146454d4f5645n;
const DAY = 86_400_000;
const TRACKING_BATCH_SIZE = 500;

@Injectable()
export class AlertsCronService {
  private readonly logger = new Logger(AlertsCronService.name);
  constructor(private readonly prisma: JobsPrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    disabled: alertsCronDisabled(),
  })
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
          for (
            let offset = 0;
            offset < clients.length;
            offset += TRACKING_BATCH_SIZE
          ) {
            const batch = clients.slice(offset, offset + TRACKING_BATCH_SIZE);
            const where = {
              OR: batch.map((client) => ({
                professionalId: client.professionalId,
                clientId: client.id,
              })),
              type: 'WORKOUT',
            };
            // A última data resolve inatividade e abandono sem carregar o histórico.
            const latest = await tx.dailyTracking.groupBy({
              by: ['professionalId', 'clientId'],
              where: { ...where, completedAt: { lte: now } },
              _max: { completedAt: true },
            });
            const recent = await tx.dailyTracking.findMany({
              where: {
                ...where,
                completedAt: { gte: fourteenDaysAgo, lte: now },
              },
              select: {
                professionalId: true,
                clientId: true,
                completedAt: true,
              },
            });
            const latestByClient = new Map(
              latest.map((tracking) => [
                JSON.stringify([tracking.professionalId, tracking.clientId]),
                tracking._max.completedAt,
              ]),
            );
            const daysByClient = new Map<string, Map<string, number>>();
            for (const workout of recent) {
              const key = JSON.stringify([
                workout.professionalId,
                workout.clientId,
              ]);
              const days = daysByClient.get(key) ?? new Map<string, number>();
              const day = workout.completedAt.toISOString().slice(0, 10);
              days.set(day, (days.get(day) ?? 0) + 1);
              daysByClient.set(key, days);
            }
            for (const client of batch) {
              const key = JSON.stringify([client.professionalId, client.id]);
              const latestWorkout = latestByClient.get(key);
              const identity = {
                clientId: client.id,
                professionalId: client.professionalId,
                patientId: null,
                createdAt: now,
              };
              if (!latestWorkout || latestWorkout < fiveDaysAgo) {
                alerts.push({
                  ...identity,
                  type: 'INACTIVE_5_DAYS',
                  severity: 'HIGH',
                  message: 'Nenhum treino registrado nos últimos 5 dias.',
                });
              }
              const overloadedDays = [
                ...(daysByClient.get(key)?.values() ?? []),
              ].filter((count) => count > 1).length;
              if (overloadedDays >= 3) {
                alerts.push({
                  ...identity,
                  type: 'OVERTRAINING_RISK',
                  severity: 'HIGH',
                  message: `Múltiplos treinos no mesmo dia detectados em ${overloadedDays} dias nas últimas 2 semanas. Risco de overtraining.`,
                });
              }
              if (latestWorkout && latestWorkout < twentyOneDaysAgo) {
                alerts.push({
                  ...identity,
                  type: 'PLATEAU_3_WEEKS',
                  severity: 'MEDIUM',
                  message:
                    'Nenhum treino registrado nas últimas 3 semanas. Possível abandono do plano.',
                });
              }
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
