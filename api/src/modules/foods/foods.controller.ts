import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Post()
  create(@Body() createFoodDto: CreateFoodDto) {
    return this.foodsService.create(createFoodDto);
  }

  @Get()
  findAll() {
    return this.foodsService.findAll();
  }
}