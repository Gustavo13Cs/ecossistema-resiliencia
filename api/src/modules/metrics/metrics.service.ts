import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string, role: string) {
    return {
      totalWorkouts: 0,
      averageSleep: 0,
      averageMood: 0,
    };
  }
}