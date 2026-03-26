// api/src/modules/metrics/metrics.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string, role: string) {
    const filter = (role === 'HR_MANAGER' || role === 'ADMIN') ? {} : { userId: userId };

    const totalWorkouts = await this.prisma.workoutLog.count({
      where: filter
    });

    const averages = await this.prisma.workoutLog.aggregate({
      where: filter,
      _avg: {
        sleepHours: true,
        moodLevel: true,
      },
    });

    return {
      totalWorkouts,
      averageSleep: averages._avg.sleepHours ? Number(averages._avg.sleepHours.toFixed(1)) : 0,
      averageMood: averages._avg.moodLevel ? Number(averages._avg.moodLevel.toFixed(1)) : 0,
    };
  }
}