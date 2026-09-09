import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';

const fullPlanInclude = {
  meals: { include: { items: { include: { food: true } } } },
} satisfies Prisma.DietPlanInclude;

@Injectable()
export class DietPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDietDto: CreateDietPlanDto, creatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.resolveOwnedClient(
        tx,
        createDietDto,
        creatorId,
      );

      await tx.dietPlan.updateMany({
        where: {
          clientId: target.clientId,
          creatorId,
          isActive: true,
        },
        data: { isActive: false },
      });

      const plan = await tx.dietPlan.create({
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
          clientId: target.clientId,
          userId: target.legacyPatientId,
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
        include: fullPlanInclude,
      });

      for (const meal of createDietDto.meals) {
        for (const item of meal.items) {
          if (item.measure && item.measure.trim() && item.measure !== 'g') {
            await tx.foodPreference.upsert({
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

      return plan;
    });
  }

  async findActiveByClient(clientId: string, requesterId: string) {
    await this.assertOwnedClient(clientId, requesterId);

    return this.prisma.dietPlan.findFirst({
      where: { clientId, creatorId: requesterId, isActive: true },
      include: fullPlanInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByClient(clientId: string, requesterId: string) {
    await this.assertOwnedClient(clientId, requesterId);

    return this.prisma.dietPlan.findMany({
      where: { clientId, creatorId: requesterId, isTemplate: false },
      include: fullPlanInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByUser(userId: string, requesterId: string) {
    await this.assertLegacyRelationship(userId, requesterId);

    return this.prisma.dietPlan.findFirst({
      where: { userId, creatorId: requesterId, isActive: true },
      include: fullPlanInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByPatient(userId: string, requesterId: string) {
    await this.assertLegacyRelationship(userId, requesterId);

    return this.prisma.dietPlan.findMany({
      where: { userId, creatorId: requesterId, isTemplate: false },
      include: {
        ...fullPlanInclude,
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleMealStatus(mealId: string, requesterId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        dietPlan: { select: { creatorId: true } },
      },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada');
    if (meal.dietPlan.creatorId !== requesterId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.meal.update({
      where: { id: mealId },
      data: { isConsumed: !meal.isConsumed },
    });
  }

  findAll(creatorId: string) {
    return this.prisma.dietPlan.findMany({
      where: { creatorId },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, requesterId: string) {
    const plan = await this.prisma.dietPlan.findUnique({ where: { id } });

    if (!plan) throw new NotFoundException('Plano de dieta não encontrado');
    if (plan.creatorId !== requesterId) {
      throw new ForbiddenException(
        'Você não pode deletar um plano que não criou',
      );
    }

    return this.prisma.dietPlan.delete({ where: { id } });
  }

  async saveAsTemplate(id: string, requesterId: string) {
    const plan = await this.prisma.dietPlan.findUnique({ where: { id } });

    if (!plan) throw new NotFoundException('Plano de dieta não encontrado');
    if (plan.creatorId !== requesterId) {
      throw new ForbiddenException(
        'Você não pode salvar um plano que não criou como template',
      );
    }

    return this.prisma.dietPlan.update({
      where: { id },
      data: { isTemplate: true },
      select: { id: true, title: true, isTemplate: true },
    });
  }

  listTemplates(creatorId: string) {
    return this.prisma.dietPlan.findMany({
      where: { creatorId, isTemplate: true },
      include: fullPlanInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async resolveOwnedClient(
    tx: Prisma.TransactionClient,
    dto: CreateDietPlanDto,
    professionalId: string,
  ) {
    if (dto.clientId) {
      const client = await tx.client.findFirst({
        where: { id: dto.clientId, professionalId },
        select: { id: true },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado');

      const legacyLink = await tx.professionalPatientLink.findFirst({
        where: { id: client.id, professionalId, isActive: true },
        select: { patientId: true },
      });
      return {
        clientId: client.id,
        legacyPatientId: legacyLink?.patientId ?? null,
      };
    }

    if (!dto.userId) {
      throw new BadRequestException('Informe o cliente da prescrição');
    }

    const legacyLink = await tx.professionalPatientLink.findFirst({
      where: {
        professionalId,
        patientId: dto.userId,
        isActive: true,
      },
      select: { id: true, patientId: true },
    });
    if (!legacyLink) throw new NotFoundException('Cliente não encontrado');

    const client = await tx.client.findFirst({
      where: { id: legacyLink.id, professionalId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    return { clientId: client.id, legacyPatientId: legacyLink.patientId };
  }

  private async assertOwnedClient(clientId: string, professionalId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, professionalId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
  }

  private async assertLegacyRelationship(
    patientId: string,
    professionalId: string,
  ) {
    const link = await this.prisma.professionalPatientLink.findUnique({
      where: { professionalId_patientId: { professionalId, patientId } },
      select: { isActive: true },
    });
    if (!link?.isActive) {
      throw new ForbiddenException('Este cliente não está vinculado a você');
    }
  }
}
