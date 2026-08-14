import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async getProfessionalAlerts(@Request() req) {
    return this.prisma.patientAlert.findMany({
      where: { professionalId: req.user.sub },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: [
        { severity: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // Endpoint unificado para o dashboard home — retorna tudo em uma chamada
  @Get('summary')
  async getDashboardSummary(@Request() req) {
    const professionalId = req.user.sub;

    // 1. Total de pacientes vinculados
    const patientsCount = await this.prisma.professionalPatientLink.count({
      where: { professionalId, isActive: true },
    });

    // 2. Contagem de alertas ativos por severidade
    const [highAlerts, mediumAlerts] = await Promise.all([
      this.prisma.patientAlert.count({
        where: { professionalId, severity: 'HIGH' },
      }),
      this.prisma.patientAlert.count({
        where: { professionalId, severity: 'MEDIUM' },
      }),
    ]);

    // 3. Últimos 5 alertas com dados do paciente
    const recentAlerts = await this.prisma.patientAlert.findMany({
      where: { professionalId },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    });

    // 4. Pacientes sem atividade recente (sem DailyTracking nos últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const linkedPatients = await this.prisma.professionalPatientLink.findMany({
      where: { professionalId, isActive: true },
      select: { patientId: true, patient: { select: { id: true, name: true } } },
      take: 20,
    });

    const inactivePatients: { id: string; name: string }[] = [];
    for (const link of linkedPatients) {
      const lastActivity = await this.prisma.dailyTracking.findFirst({
        where: {
          patientId: link.patientId,
          completedAt: { gte: sevenDaysAgo },
        },
      });
      if (!lastActivity) {
        inactivePatients.push({ id: link.patientId, name: (link as any).patient.name });
        if (inactivePatients.length >= 3) break;
      }
    }

    return {
      patientsCount,
      activeAlertsCount: highAlerts + mediumAlerts,
      highAlertsCount: highAlerts,
      mediumAlertsCount: mediumAlerts,
      recentAlerts,
      inactivePatients,
    };
  }
}
