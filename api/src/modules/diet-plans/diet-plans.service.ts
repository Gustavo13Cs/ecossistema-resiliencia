import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreateDietPlanDto,
  CreateDietTemplateDto,
  UpdateDietTemplateDto,
  ScaleAndImportTemplateDto,
} from './dto/create-diet-plan.dto';
import {
  SYSTEM_DIET_TEMPLATES,
  SystemDietTemplate,
} from './system-templates.data';

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

  async listTemplates(
    creatorId: string,
    status: 'all' | 'active' | 'archived' = 'active',
  ) {
    const whereClause: Prisma.DietPlanWhereInput = {
      creatorId,
      isTemplate: true,
    };

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'archived') {
      whereClause.isActive = false;
    }

    return this.prisma.dietPlan.findMany({
      where: whereClause,
      include: fullPlanInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  getSystemTemplates() {
    return SYSTEM_DIET_TEMPLATES;
  }

  async createTemplate(dto: CreateDietTemplateDto, creatorId: string) {
    return this.prisma.dietPlan.create({
      data: {
        title: dto.title,
        goal: dto.goal,
        targetKcal: dto.targetKcal,
        proteinG: dto.proteinG,
        fatG: dto.fatG,
        carbsG: dto.carbsG,
        fiberG: dto.fiberG,
        sodiumMg: dto.sodiumMg,
        calciumMg: dto.calciumMg,
        ironMg: dto.ironMg,
        notes: dto.notes,
        durationDays: dto.durationDays || 30,
        creatorId,
        isTemplate: true,
        isActive: true,
        meals: {
          create: dto.meals.map((meal) => ({
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
  }

  async updateTemplate(
    id: string,
    dto: UpdateDietTemplateDto,
    creatorId: string,
  ) {
    const template = await this.prisma.dietPlan.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.creatorId !== creatorId) {
      throw new ForbiddenException('Acesso negado a este template');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.meals) {
        const existingMeals = await tx.meal.findMany({
          where: { dietPlanId: id },
          select: { id: true },
        });
        const mealIds = existingMeals.map((m) => m.id);
        if (mealIds.length > 0) {
          await tx.mealItem.deleteMany({ where: { mealId: { in: mealIds } } });
          await tx.meal.deleteMany({ where: { dietPlanId: id } });
        }
      }

      return tx.dietPlan.update({
        where: { id },
        data: {
          title: dto.title,
          goal: dto.goal,
          targetKcal: dto.targetKcal,
          proteinG: dto.proteinG,
          fatG: dto.fatG,
          carbsG: dto.carbsG,
          fiberG: dto.fiberG,
          notes: dto.notes,
          durationDays: dto.durationDays,
          ...(dto.meals
            ? {
                meals: {
                  create: dto.meals.map((meal) => ({
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
              }
            : {}),
        },
        include: fullPlanInclude,
      });
    });
  }

  async duplicateTemplate(id: string, creatorId: string) {
    if (id.startsWith('system-tpl-')) {
      const sysTpl = SYSTEM_DIET_TEMPLATES.find((t) => t.id === id);
      if (!sysTpl) {
        throw new NotFoundException('Template do sistema não encontrado');
      }

      return this.prisma.$transaction(async (tx) => {
        const preparedMeals: Array<{
          name: string;
          time?: string | null;
          notes?: string | null;
          items: Array<{
            quantity: number;
            measure: string;
            notes?: string | null;
            foodId: string;
          }>;
        }> = [];

        for (const meal of sysTpl.meals) {
          const preparedItems: Array<{
            quantity: number;
            measure: string;
            notes?: string | null;
            foodId: string;
          }> = [];

          for (const item of meal.items) {
            let resolvedFoodId = item.foodId;
            if (!resolvedFoodId) {
              const existing = await tx.food.findFirst({
                where: { name: { contains: item.name, mode: 'insensitive' } },
              });
              if (existing) {
                resolvedFoodId = existing.id;
              } else {
                const created = await tx.food.create({
                  data: {
                    name: item.name || 'Alimento',
                    baseUnit:
                      item.measure === 'g' || item.measure === 'ml'
                        ? '100g'
                        : '1 unidade',
                    baseAmount:
                      item.measure === 'g' || item.measure === 'ml' ? 100 : 1,
                    kcal: 100,
                    protein: 5,
                    carbs: 10,
                    fat: 2,
                    source: 'SAFE_MOVE_TEMPLATE',
                  },
                });
                resolvedFoodId = created.id;
              }
            }

            preparedItems.push({
              quantity: item.quantity,
              measure: item.measure || 'g',
              notes: item.notes || null,
              foodId: resolvedFoodId,
            });
          }

          preparedMeals.push({
            name: meal.name,
            time: meal.time || null,
            notes: meal.notes || null,
            items: preparedItems,
          });
        }

        return tx.dietPlan.create({
          data: {
            title: `${sysTpl.title} (Personalizado)`,
            goal: sysTpl.goal,
            targetKcal: sysTpl.targetKcal,
            proteinG: sysTpl.proteinG,
            fatG: sysTpl.fatG,
            carbsG: sysTpl.carbsG,
            fiberG: sysTpl.fiberG,
            notes: sysTpl.notes,
            durationDays: sysTpl.durationDays,
            creatorId,
            isTemplate: true,
            isActive: true,
            meals: {
              create: preparedMeals.map((m) => ({
                name: m.name,
                time: m.time,
                notes: m.notes,
                items: {
                  create: m.items.map((it) => ({
                    quantity: it.quantity,
                    measure: it.measure,
                    notes: it.notes,
                    foodId: it.foodId,
                  })),
                },
              })),
            },
          },
          include: fullPlanInclude,
        });
      });
    }

    const source = await this.prisma.dietPlan.findUnique({
      where: { id },
      include: fullPlanInclude,
    });
    if (!source) throw new NotFoundException('Template não encontrado');
    if (source.creatorId !== creatorId) {
      throw new ForbiddenException('Acesso negado a este template');
    }

    let newTitle = `${source.title} (Cópia)`;
    const versionMatch = source.title.match(/V(\d+)$/i);
    if (versionMatch) {
      const nextVersion = parseInt(versionMatch[1], 10) + 1;
      newTitle = source.title.replace(/V\d+$/i, `V${nextVersion}`);
    }

    return this.prisma.dietPlan.create({
      data: {
        title: newTitle,
        goal: source.goal,
        targetKcal: source.targetKcal,
        proteinG: source.proteinG,
        fatG: source.fatG,
        carbsG: source.carbsG,
        fiberG: source.fiberG,
        sodiumMg: source.sodiumMg,
        calciumMg: source.calciumMg,
        ironMg: source.ironMg,
        notes: source.notes,
        durationDays: source.durationDays,
        creatorId,
        isTemplate: true,
        isActive: true,
        meals: {
          create: source.meals.map((meal) => ({
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
  }

  async toggleArchiveTemplate(id: string, creatorId: string) {
    const template = await this.prisma.dietPlan.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.creatorId !== creatorId) {
      throw new ForbiddenException('Acesso negado a este template');
    }

    return this.prisma.dietPlan.update({
      where: { id },
      data: { isActive: !template.isActive },
      include: fullPlanInclude,
    });
  }

  async importTemplateToClient(
    templateId: string,
    dto: ScaleAndImportTemplateDto,
    creatorId: string,
  ) {
    await this.assertOwnedClient(dto.clientId, creatorId);

    let templateData: {
      title: string;
      goal: string;
      targetKcal: number;
      proteinG: number;
      fatG: number;
      carbsG: number;
      fiberG?: number | null;
      notes?: string | null;
      durationDays?: number;
      meals: Array<{
        name: string;
        time?: string | null;
        notes?: string | null;
        items: Array<{
          quantity: number;
          measure: string;
          notes?: string | null;
          foodId?: string;
          name?: string;
        }>;
      }>;
    };

    const isSystemTemplate = templateId.startsWith('system-tpl-');
    if (isSystemTemplate) {
      const sysTpl = SYSTEM_DIET_TEMPLATES.find((t) => t.id === templateId);
      if (!sysTpl) {
        throw new NotFoundException('Template do sistema não encontrado');
      }
      templateData = sysTpl;
    } else {
      const dbTpl = await this.prisma.dietPlan.findUnique({
        where: { id: templateId },
        include: fullPlanInclude,
      });
      if (!dbTpl) throw new NotFoundException('Template não encontrado');
      if (dbTpl.creatorId !== creatorId) {
        throw new ForbiddenException('Acesso negado a este template');
      }
      templateData = dbTpl;
    }

    const baseKcal = templateData.targetKcal || 2000;
    const targetKcal =
      dto.targetKcal && dto.targetKcal > 0 ? dto.targetKcal : baseKcal;
    const scaleFactor = targetKcal / baseKcal;

    const proteinG = Math.round(templateData.proteinG * scaleFactor);
    const carbsG = Math.round(templateData.carbsG * scaleFactor);
    const fatG = Math.round(templateData.fatG * scaleFactor);
    const fiberG = templateData.fiberG
      ? Math.round(templateData.fiberG * scaleFactor)
      : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.dietPlan.updateMany({
        where: { clientId: dto.clientId, creatorId, isActive: true },
        data: { isActive: false },
      });

      const preparedMeals: Array<{
        name: string;
        time?: string | null;
        notes?: string | null;
        items: Array<{
          quantity: number;
          measure: string;
          notes?: string | null;
          foodId: string;
        }>;
      }> = [];

      for (const meal of templateData.meals) {
        const preparedItems: Array<{
          quantity: number;
          measure: string;
          notes?: string | null;
          foodId: string;
        }> = [];

        for (const item of meal.items) {
          let resolvedFoodId = item.foodId;
          if (!resolvedFoodId) {
            const existing = await tx.food.findFirst({
              where: { name: { contains: item.name, mode: 'insensitive' } },
            });
            if (existing) {
              resolvedFoodId = existing.id;
            } else {
              const created = await tx.food.create({
                data: {
                  name: item.name || 'Alimento',
                  baseUnit:
                    item.measure === 'g' || item.measure === 'ml'
                      ? '100g'
                      : '1 unidade',
                  baseAmount:
                    item.measure === 'g' || item.measure === 'ml' ? 100 : 1,
                  kcal: 100,
                  protein: 5,
                  carbs: 10,
                  fat: 2,
                  source: 'SAFE_MOVE_TEMPLATE',
                },
              });
              resolvedFoodId = created.id;
            }
          }

          let scaledQuantity = item.quantity * scaleFactor;
          const measureLower = (item.measure || '').toLowerCase();
          if (measureLower === 'g' || measureLower === 'ml') {
            scaledQuantity = Math.max(5, Math.round(scaledQuantity / 5) * 5);
          } else {
            scaledQuantity = Math.max(0.5, Math.round(scaledQuantity * 2) / 2);
          }

          preparedItems.push({
            quantity: scaledQuantity,
            measure: item.measure || 'g',
            notes: item.notes || null,
            foodId: resolvedFoodId,
          });
        }

        preparedMeals.push({
          name: meal.name,
          time: meal.time || null,
          notes: meal.notes || null,
          items: preparedItems,
        });
      }

      return tx.dietPlan.create({
        data: {
          title: dto.title || `${templateData.title} (Adaptado)`,
          goal: templateData.goal,
          targetKcal,
          proteinG,
          carbsG,
          fatG,
          fiberG,
          durationDays: dto.durationDays || templateData.durationDays || 30,
          notes: dto.notes ?? templateData.notes,
          clientId: dto.clientId,
          creatorId,
          isActive: true,
          isTemplate: false,
          meals: {
            create: preparedMeals.map((m) => ({
              name: m.name,
              time: m.time,
              notes: m.notes,
              items: {
                create: m.items.map((it) => ({
                  quantity: it.quantity,
                  measure: it.measure,
                  notes: it.notes,
                  foodId: it.foodId,
                })),
              },
            })),
          },
        },
        include: fullPlanInclude,
      });
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
