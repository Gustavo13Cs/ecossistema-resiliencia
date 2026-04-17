import { Controller, Get, Post, Body, UseGuards, Query, Param, Delete, Put } from '@nestjs/common';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Get('search')
  search(@Query('q') query: string, @Query('source') source?: string) {
    return this.foodsService.searchFoods(query, source);
  }

  @Post()
  create(@Body() createFoodDto: CreateFoodDto) {
    return this.foodsService.create(createFoodDto);
  }

  @Get()
  findAll(@Query('source') source?: string) {
    return this.foodsService.findAll(source);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateFoodDto: Partial<CreateFoodDto>) {
    return this.foodsService.update(id, updateFoodDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.foodsService.remove(id);
  }
}