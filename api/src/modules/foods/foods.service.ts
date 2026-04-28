import { Injectable,BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';

@Injectable()
export class FoodsService {
  constructor(private prisma: PrismaService) {}


  async searchFoods(query: string, sourceFilter?: string) {
    if (!query || query.length < 2) return [];

    const whereClause: any = {
      name: { contains: query, mode: 'insensitive' }
    };

    if (sourceFilter && sourceFilter !== 'TODAS') {
      whereClause.source = sourceFilter;
    }

    return this.prisma.food.findMany({
      where: whereClause,
      take: 20
    });
  }

  async create(createFoodDto: CreateFoodDto) {
    return this.prisma.food.create({ data: createFoodDto });
  }

  async findAll(sourceFilter?: string) {
    const whereClause: any = {};
    
    if (sourceFilter && sourceFilter !== 'TODAS') {
      whereClause.source = sourceFilter;
    }

    return this.prisma.food.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: 50
    });
  }

  async update(id: string, data: Partial<CreateFoodDto>) {
    return this.prisma.food.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const inUse = await this.prisma.mealItem.findFirst({
      where: { foodId: id }
    });

    if (inUse) {
      throw new BadRequestException('Este alimento não pode ser apagado pois está a ser utilizado numa prescrição.');
    }

    return this.prisma.food.delete({ where: { id } });
  }

  async getPreference(foodId: string, nutritionistId: string, quantity: number) {
    return this.prisma.foodPreference.findUnique({
      where: {
        nutritionistId_foodId_quantity: { nutritionistId, foodId, quantity },
      },
    });
  }
}