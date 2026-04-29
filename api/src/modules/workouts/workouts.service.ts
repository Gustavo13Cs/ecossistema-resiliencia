import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(professionalId: string, data: CreateWorkoutDto) {
    const { splits, userId, ...workoutData } = data;

    await this.prisma.workout.updateMany({
      where: { userId: userId, isActive: true },
      data: { isActive: false }
    });

    return this.prisma.workout.create({
      data: {
        ...workoutData,
        userId: userId,
        creatorId: professionalId,
        isActive: true,
        splits: {
          create: splits.map(split => ({
            name: split.name,
            focus: split.focus,
            exercises: {
              create: split.exercises.map(ex => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest: ex.rest,
                notes: ex.notes
              }))
            }
          }))
        }
      }
    });
  }

  async findAllByProfessional(professionalId: string) {
    return this.prisma.workout.findMany({
      where: { creatorId: professionalId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findActiveByUser(userId: string) {
    return this.prisma.workout.findFirst({
      where: { userId: userId, isActive: true },
      include: {
        splits: {
          include: { exercises: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async remove(id: string) {
    return this.prisma.workout.delete({ where: { id } });
  }
}