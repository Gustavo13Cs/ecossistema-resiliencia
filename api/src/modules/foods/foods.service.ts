import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FoodsService {
  constructor(private prisma: PrismaService) {}

  async searchFoods(query: string, sourceFilter?: string) {
    if (!query || query.length < 2) return [];

    const whereClause: Prisma.FoodWhereInput = {
      name: { contains: query, mode: 'insensitive' },
    };

    if (sourceFilter && sourceFilter !== 'TODAS') {
      whereClause.source = sourceFilter;
    }

    return this.prisma.food.findMany({
      where: whereClause,
      take: 20,
    });
  }

  async create(createFoodDto: CreateFoodDto) {
    if (
      createFoodDto.source !== undefined &&
      createFoodDto.source !== 'MANUAL'
    ) {
      throw new BadRequestException(
        'Somente alimentos manuais podem ser cadastrados.',
      );
    }
    return this.prisma.food.create({
      data: {
        ...this.scalarFields(createFoodDto),
        name: createFoodDto.name,
        kcal: createFoodDto.kcal,
        protein: createFoodDto.protein,
        carbs: createFoodDto.carbs,
        fat: createFoodDto.fat,
        source: 'MANUAL',
      },
    });
  }

  async findAll(sourceFilter?: string) {
    const whereClause: Prisma.FoodWhereInput = {};

    if (sourceFilter && sourceFilter !== 'TODAS') {
      whereClause.source = sourceFilter;
    }

    return this.prisma.food.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async update(id: string, data: UpdateFoodDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockManualFood(tx, id);
      if (await this.isInUse(tx, id)) {
        throw new ConflictException(
          'Este alimento já está em uso em uma dieta ou receita. Cadastre um novo alimento para preservar as prescrições existentes.',
        );
      }
      return tx.food.update({ where: { id }, data: this.scalarFields(data) });
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockManualFood(tx, id);
      if (await this.isInUse(tx, id)) {
        throw new BadRequestException(
          'Este alimento não pode ser apagado pois está em uso em uma dieta ou receita.',
        );
      }
      return tx.food.delete({ where: { id } });
    });
  }

  private async lockManualFood(tx: Prisma.TransactionClient, id: string) {
    // FOR UPDATE conflita com o lock da FK: uma nova prescrição não pode entrar
    // entre a verificação de referências e a alteração do catálogo compartilhado.
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "foods" WHERE "id" = ${id} FOR UPDATE
    `;
    if (rows.length === 0)
      throw new NotFoundException('Alimento não encontrado.');
    const food = await tx.food.findUnique({
      where: { id },
      select: { source: true },
    });
    if (!food) throw new NotFoundException('Alimento não encontrado.');
    if (food.source !== 'MANUAL') {
      throw new ForbiddenException(
        'Alimentos de bases oficiais não podem ser alterados.',
      );
    }
  }

  private async isInUse(tx: Prisma.TransactionClient, foodId: string) {
    const rows = await tx.$queryRaw<Array<{ used: boolean }>>`
      SELECT safemove_private.food_in_use(${foodId}) AS used
    `;
    if (rows.length !== 1 || typeof rows[0].used !== 'boolean')
      throw new Error('Catalog reference check unavailable');
    return rows[0].used;
  }

  private scalarFields(data: UpdateFoodDto) {
    return {
      name: data.name,
      baseUnit: data.baseUnit,
      baseAmount: data.baseAmount,
      kcal: data.kcal,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber,
      sodium: data.sodium,
      calcium: data.calcium,
      iron: data.iron,
    };
  }

  async getPreference(
    foodId: string,
    nutritionistId: string,
    quantity: number,
  ) {
    return this.prisma.foodPreference.findUnique({
      where: {
        nutritionistId_foodId_quantity: { nutritionistId, foodId, quantity },
      },
    });
  }
}
