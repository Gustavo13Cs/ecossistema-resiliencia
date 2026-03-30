import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWorkoutDto: any) {
    return this.prisma.workoutLog.create({
      data: {
        ...createWorkoutDto,
        userId: userId,
      },
    });
  }

  async findAll(userId: string, role: string) {
    const filter = (role === 'HR_MANAGER' || role === 'ADMIN') ? {} : { userId: userId };

    return this.prisma.workoutLog.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: 20, 
      include: {
        user: {
          select: { name: true }
        }
      }
    });
  }
}