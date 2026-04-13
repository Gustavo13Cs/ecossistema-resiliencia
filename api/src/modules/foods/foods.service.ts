import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';

@Injectable()
export class FoodsService {
  constructor(private prisma: PrismaService) {}

  async create(createFoodDto: CreateFoodDto) {
    return this.prisma.food.create({
      data: createFoodDto,
    });
  }

  async findAll() {
    return this.prisma.food.findMany({
      orderBy: { name: 'asc' },
    });
  }
}