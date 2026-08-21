import { Injectable } from '@nestjs/common';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateMetricCheckInDto } from './dto/create-metric-check-in.dto';

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
  ) {}

  async registerCheckIn(user: AuthUser, dto: CreateMetricCheckInDto) {
    this.patientAccess.assertPatientSelf(user, user.sub);

    return this.prisma.dailyTracking.create({
      data: {
        patientId: user.sub,
        type: dto.type,
        itemName: dto.itemName,
      },
    });
  }

  async getWeeklyConsistency(user: AuthUser, patientId: string) {
    await this.patientAccess.assertCanReadPatient(user, patientId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trackings = await this.prisma.dailyTracking.findMany({
      where: {
        patientId,
        completedAt: { gte: sevenDaysAgo },
      },
      orderBy: { completedAt: 'desc' },
    });

    const activeDays = new Set(
      trackings.map((t) => t.completedAt.toISOString().split('T')[0]),
    ).size;

    const percentage = Math.round((activeDays / 7) * 100);

    return {
      percentage,
      activeDays,
      totalLogs: trackings.length,
      history: trackings,
    };
  }

  async getTodayLogs(user: AuthUser, patientId: string) {
    await this.patientAccess.assertCanReadPatient(user, patientId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.dailyTracking.findMany({
      where: {
        patientId,
        completedAt: { gte: today },
      },
    });
  }
}
