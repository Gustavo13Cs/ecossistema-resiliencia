import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
  Delete,
  Put,
  Request,
  ForbiddenException,
  Header,
} from '@nestjs/common';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { FoodPreferenceQueryDto } from './dto/food-preference-query.dto';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @ClinicalResponse({ exception: 'catalog' })
  @Get('search')
  search(@Query('q') query: string, @Query('source') source?: string) {
    return this.foodsService.searchFoods(query, source);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Post()
  create(@Body() createFoodDto: CreateFoodDto) {
    return this.foodsService.create(createFoodDto);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Get()
  findAll(@Query('source') source?: string) {
    return this.foodsService.findAll(source);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Put(':id')
  update(@Param('id') id: string, @Body() updateFoodDto: UpdateFoodDto) {
    return this.foodsService.update(id, updateFoodDto);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.foodsService.remove(id);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Get(':id/preference')
  @Header('Cache-Control', 'no-store')
  async getPreference(
    @Param('id') foodId: string,
    @Request() request: AuthenticatedRequest,
    @Query() query: FoodPreferenceQueryDto,
  ) {
    if (query.nutritionistId && query.nutritionistId !== request.user.sub) {
      throw new ForbiddenException('Acesso negado.');
    }
    return this.foodsService.getPreference(
      foodId,
      request.user.sub,
      query.quantity,
    );
  }
}
