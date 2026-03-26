import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getCompanyDashboard() {
    const totalWorkouts = await this.prisma.workoutLog.count();

    const averages = await this.prisma.workoutLog.aggregate({
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