import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWorkoutDto: CreateWorkoutDto) {
    const workout = await this.prisma.workoutLog.create({
      data: {
        ...createWorkoutDto,
        userId: userId, 
      },
    });
    return workout;
  }

  async findAll(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { 
        userId: userId 
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });
  }
}