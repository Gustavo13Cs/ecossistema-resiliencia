import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';

@Injectable()
export class DietPlansService {
  constructor(private prisma: PrismaService) {}

  async create(createDietDto: CreateDietPlanDto, creatorId: string) {
    // 1. Arquiva a dieta antiga (Deixa inativa) para manter o histórico
    await this.prisma.dietPlan.updateMany({
      where: { userId: createDietDto.userId, isActive: true },
      data: { isActive: false },
    });

    // 2. Cria a Nova Dieta + Refeições + Itens numa única transação!
    return this.prisma.dietPlan.create({
      data: {
        title: createDietDto.title,
        goal: createDietDto.goal,
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
      // Retorna a dieta já com tudo preenchido (incluindo os nomes dos alimentos TACO)
      include: {
        meals: {
          include: { items: { include: { food: true } } },
        },
      },
    });
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
}