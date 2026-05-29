import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async registerCheckIn(patientId: string, type: string, itemName: string) {
    return this.prisma.dailyTracking.create({
      data: {
        patientId,
        type,
        itemName,
      },
    });
  }

  async getWeeklyConsistency(patientId: string) {
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
      trackings.map(t => t.completedAt.toISOString().split('T')[0])
    ).size;

    const percentage = Math.round((activeDays / 7) * 100);

    return {
      percentage,
      activeDays,
      totalLogs: trackings.length,
      history: trackings, 
    };
  }

  async getTodayLogs(patientId: string) {
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