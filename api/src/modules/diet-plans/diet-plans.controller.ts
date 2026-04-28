import { Controller, Post, Body, Get, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { DietPlansService } from './diet-plans.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('diet-plans')
export class DietPlansController {
  constructor(private readonly dietPlansService: DietPlansService) {}

  @Post()
  create(@Request() req, @Body() createDietDto: CreateDietPlanDto) {
    return this.dietPlansService.create(createDietDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req) {
    return this.dietPlansService.findAll(req.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(@Param('userId') userId: string) {
    return this.dietPlansService.findActiveByUserId(userId);
  }

  @Patch('meal/:mealId/toggle')
  toggleMealStatus(@Param('mealId') mealId: string) {
    return this.dietPlansService.toggleMealStatus(mealId);
  }
}