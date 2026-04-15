import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Get('search')
  search(@Query('q') query: string) {
    return this.foodsService.searchFoods(query);
  }

  // 📝 ROTA ORIGINAL: Mantém o cadastro manual a funcionar perfeitamente
  @Post()
  create(@Body() createFoodDto: CreateFoodDto) {
    return this.foodsService.create(createFoodDto);
  }

  // 📋 ROTA ORIGINAL: Mantém a listagem inicial
  @Get()
  findAll() {
    return this.foodsService.findAll();
  }
}