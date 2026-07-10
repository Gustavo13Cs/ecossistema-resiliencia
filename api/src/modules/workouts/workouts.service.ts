// api/src/modules/workouts/workouts.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(professionalId: string, data: CreateWorkoutDto) {
    const { splits, userId, ...workoutData } = data;

    await this.prisma.workout.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.workout.create({
      data: {
        title: workoutData.title,
        goal: workoutData.goal,
        durationWeeks: workoutData.durationWeeks,
        notes: workoutData.notes,
        userId,
        creatorId: professionalId,
        isActive: true,
        splits: {
          create: splits.map((split) => ({
            name: split.name,
            focus: split.focus,
            exercises: {
              create: split.exercises.map((ex) => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest: ex.rest,
                notes: ex.notes,
              })),
            },
          })),
        },
      },
    });
  }

  async findAllByProfessional(professionalId: string) {
    return this.prisma.workout.findMany({
      where: { creatorId: professionalId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByUser(userId: string, requesterId: string, isProfessional: boolean) {
    // profissional verifica vínculo com o paciente
    if (isProfessional) {
      const link = await this.prisma.professionalPatientLink.findUnique({
        where: {
          professionalId_patientId: {
            professionalId: requesterId,
            patientId: userId,
          },
        },
      });

      if (!link || !link.isActive) {
        throw new ForbiddenException('Este paciente não está vinculado a você');
      }
    }

    return this.prisma.workout.findFirst({
      where: { userId, isActive: true },
      include: {
        splits: {
          include: { exercises: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, requesterId: string) {
    const workout = await this.prisma.workout.findUnique({ where: { id } });

    if (!workout) throw new NotFoundException('Treino não encontrado');

    if (workout.creatorId !== requesterId) {
      throw new ForbiddenException('Você não pode deletar um treino que não criou');
    }

    return this.prisma.workout.delete({ where: { id } });
  }
}