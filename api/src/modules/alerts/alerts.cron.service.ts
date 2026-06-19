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
    this.logger.log('Iniciando processamento analítico de alertas (UTI)...');

    // 1. Limpa os alertas do dia anterior para não acumular lixo
    await this.prisma.patientAlert.deleteMany({});

    // 2. Busca pacientes vinculados a profissionais
    const links = await this.prisma.professionalPatientLink.findMany({
      where: { isActive: true },
      select: { professionalId: true, patientId: true }
    });

    const alertsToInsert: any[] = [];
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    for (const link of links) {
      // REGRA 1: Inatividade (Sem treinos há 5 dias)
      // Nota: Assumindo que você tem uma tabela WorkoutSession. Adapte o nome.
      const lastWorkout = await this.prisma.workoutSession.findFirst({
        where: { patientId: link.patientId, completed: true },
        orderBy: { date: 'desc' },
      });

      if (!lastWorkout || lastWorkout.date < fiveDaysAgo) {
        alertsToInsert.push({
          type: 'INACTIVE_5_DAYS',
          severity: 'HIGH',
          message: 'Nenhum treino concluído nos últimos 5 dias.',
          patientId: link.patientId,
          professionalId: link.professionalId,
        });
      }

      // REGRA 2: Risco de Overtraining (PSE >= 9 consistently)
      const recentWorkouts = await this.prisma.workoutSession.findMany({
        where: { 
          patientId: link.patientId, 
          completed: true,
          date: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } // Últimos 14 dias
        },
        select: { pseScore: true } // Percepção Subjetiva de Esforço
      });

      const highPseWorkouts = recentWorkouts.filter(w => w.pseScore && w.pseScore >= 9);
      if (recentWorkouts.length > 0 && highPseWorkouts.length / recentWorkouts.length >= 0.7) {
        alertsToInsert.push({
          type: 'OVERTRAINING_RISK',
          severity: 'HIGH',
          message: 'PSE em 9 ou mais em 70% dos treinos das últimas 2 semanas. Risco iminente de lesão.',
          patientId: link.patientId,
          professionalId: link.professionalId,
        });
      }

      // REGRA 3: Platô de Tonelagem (Omitido para brevidade, mas segue a mesma lógica)
      // Query buscando volume de carga por exercício nas últimas 3 semanas e comparando.
    }

    if (alertsToInsert.length > 0) {
      await this.prisma.patientAlert.createMany({ data: alertsToInsert });
    }

    this.logger.log(`Processamento concluído. ${alertsToInsert.length} alertas gerados.`);
  }
}