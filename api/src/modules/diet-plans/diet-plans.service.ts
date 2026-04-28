import { Injectable } from '@nestjs/common';
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
        notes: createDietDto.notes,
        userId: createDietDto.userId,
        creatorId: creatorId,
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
        meals: {
          include: { items: { include: { food: true } } },
        },
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
  // Busca a dieta ativa atual de um paciente para mostrar no App dele
  async findActiveByUserId(userId: string) {
    return this.prisma.dietPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        meals: {
          include: { items: { include: { food: true } } },
        },
      },
    });
  }

  // Altera o status da refeição (Check / Uncheck)
  async toggleMealStatus(mealId: string) {
    const meal = await this.prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw new Error('Refeição não encontrada');
    
    return this.prisma.meal.update({
      where: { id: mealId },
      data: { isConsumed: !meal.isConsumed },
    });
  }

  async findAll(creatorId: string) {
    return this.prisma.dietPlan.findMany({
      where: { creatorId: creatorId },
      include: {
        user: { select: { name: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}