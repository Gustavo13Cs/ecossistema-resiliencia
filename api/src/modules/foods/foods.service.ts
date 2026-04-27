import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';

@Injectable()
export class FoodsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}


  async onModuleInit() {
    const tacoFoods = [
      { name: 'Arroz branco, cozido', baseUnit: '100g', baseAmount: 100, kcal: 130, protein: 2.5, carbs: 28.1, fat: 0.2, source: 'TACO' },
      { name: 'Feijão carioca, cozido', baseUnit: '100g', baseAmount: 100, kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5, source: 'TACO' },
      { name: 'Feijão preto, cozido', baseUnit: '100g', baseAmount: 100, kcal: 77, protein: 4.5, carbs: 14.0, fat: 0.5, source: 'TACO' },
      { name: 'Peito de frango, sem pele, grelhado', baseUnit: '100g', baseAmount: 100, kcal: 159, protein: 32.0, carbs: 0, fat: 2.5, source: 'TACO' },
      { name: 'Ovo de galinha, inteiro, cozido', baseUnit: '100g', baseAmount: 100, kcal: 146, protein: 13.3, carbs: 0.6, fat: 9.5, source: 'TACO' },
      { name: 'Pão francês', baseUnit: '100g', baseAmount: 100, kcal: 300, protein: 8.0, carbs: 58.6, fat: 3.1, source: 'TACO' },
      { name: 'Tapioca', baseUnit: '100g', baseAmount: 100, kcal: 336, protein: 0, carbs: 83.6, fat: 0, source: 'TACO' },
      { name: 'Cuscuz de milho, cozido', baseUnit: '100g', baseAmount: 100, kcal: 112, protein: 2.2, carbs: 25.3, fat: 0.7, source: 'TACO' },
      { name: 'Aveia em flocos', baseUnit: '100g', baseAmount: 100, kcal: 394, protein: 13.9, carbs: 66.6, fat: 8.5, source: 'TACO' },
      { name: 'Carne bovina, patinho, grelhado', baseUnit: '100g', baseAmount: 100, kcal: 219, protein: 35.9, carbs: 0, fat: 7.3, source: 'TACO' }
    ];

    for (const food of tacoFoods) {
      const exists = await this.prisma.food.findFirst({ where: { name: food.name } });
      if (!exists) {
        await this.prisma.food.create({ data: food });
      } else {
        await this.prisma.food.update({ where: { id: exists.id }, data: { source: 'TACO' } });
      }
    }
  }

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
    await this.prisma.mealItem.deleteMany({ where: { foodId: id } });
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