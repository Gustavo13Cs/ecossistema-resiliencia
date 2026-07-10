// api/src/modules/diet-plans/diet-plans.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';

@Injectable()
export class DietPlansService {
  constructor(private prisma: PrismaService) {}

  async create(createDietDto: CreateDietPlanDto, creatorId: string) {
    await this.prisma.dietPlan.updateMany({
      where: { userId: createDietDto.userId, isActive: true },
      data: { isActive: false },
    });

    const novaDieta = await this.prisma.dietPlan.create({
      data: {
        title: createDietDto.title,
        goal: createDietDto.goal,
        durationDays: createDietDto.durationDays,
        tmb: createDietDto.tmb,
        get: createDietDto.get,
        targetKcal: createDietDto.targetKcal,
        proteinG: createDietDto.proteinG,
        fatG: createDietDto.fatG,
        carbsG: createDietDto.carbsG,
        fiberG: createDietDto.fiberG,
        sodiumMg: createDietDto.sodiumMg,
        calciumMg: createDietDto.calciumMg,
        ironMg: createDietDto.ironMg,
        notes: createDietDto.notes,
        userId: createDietDto.userId,
        creatorId,
        meals: {
          create: createDietDto.meals.map((meal) => ({
            name: meal.name,
            time: meal.time,
            notes: meal.notes,
            items: {
              create: meal.items.map((item) => ({
                quantity: item.quantity,
                measure: item.measure,
                notes: item.notes,
                foodId: item.foodId,
              })),
            },
          })),
        },
      },
      include: {
        meals: { include: { items: { include: { food: true } } } },
      },
    });

    for (const meal of createDietDto.meals) {
      for (const item of meal.items) {
        if (item.measure && item.measure.trim() !== '' && item.measure !== 'g') {
          await this.prisma.foodPreference.upsert({
            where: {
              nutritionistId_foodId_quantity: {
                nutritionistId: creatorId,
                foodId: item.foodId,
                quantity: item.quantity,
              },
            },
            update: { measure: item.measure },
            create: {
              nutritionistId: creatorId,
              foodId: item.foodId,
              quantity: item.quantity,
              measure: item.measure,
            },
          });
        }
      }
    }

    return novaDieta;
  }

  async findActiveByUser(userId: string, requesterId: string, isProfessional: boolean) {
    // profissional: verifica se o paciente está vinculado a ele
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

    return this.prisma.dietPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        meals: {
          include: { items: { include: { food: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleMealStatus(mealId: string, requesterId: string, requesterRole: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        dietPlan: { select: { userId: true, creatorId: true } },
      },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada');

    const isProfessional = ['NUTRITIONIST', 'ADMIN'].includes(requesterRole);
    const isOwner = meal.dietPlan.userId === requesterId;
    const isCreator = meal.dietPlan.creatorId === requesterId;

    // só o paciente dono ou o profissional criador da dieta pode fazer toggle
    if (!isOwner && !isCreator && !isProfessional) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.meal.update({
      where: { id: mealId },
      data: { isConsumed: !meal.isConsumed },
    });
  }

  async findAll(creatorId: string) {
    return this.prisma.dietPlan.findMany({
      where: { creatorId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, requesterId: string) {
    const plan = await this.prisma.dietPlan.findUnique({ where: { id } });

    if (!plan) throw new NotFoundException('Plano de dieta não encontrado');

    if (plan.creatorId !== requesterId) {
      throw new ForbiddenException('Você não pode deletar um plano que não criou');
    }

    return this.prisma.dietPlan.delete({ where: { id } });
  }
}