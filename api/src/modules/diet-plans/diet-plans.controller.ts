import {
  Controller, Post, Body, Get, Param,
  Patch, Delete, Request, ForbiddenException, UseGuards,
} from '@nestjs/common';
import { DietPlansService } from './diet-plans.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('diet-plans')
export class DietPlansController {
  constructor(private readonly dietPlansService: DietPlansService) {}

  // Só nutricionistas e admins criam dietas
  @Roles('NUTRITIONIST', 'ADMIN')
  @Post()
  create(@Request() req, @Body() createDietDto: CreateDietPlanDto) {
    return this.dietPlansService.create(createDietDto, req.user.sub);
  }

  // Lista dietas criadas pelo profissional logado
  @Roles('NUTRITIONIST', 'ADMIN')
  @Get()
  findAll(@Request() req) {
    return this.dietPlansService.findAll(req.user.sub);
  }

  // Paciente só vê a própria dieta; profissional vê de qualquer paciente vinculado
  @Get('user/:userId/active')
  findActiveByUser(@Request() req, @Param('userId') userId: string) {
    const isProfessional = ['NUTRITIONIST', 'ADMIN'].includes(req.user.role);

    if (!isProfessional && req.user.sub !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.dietPlansService.findActiveByUser(userId, req.user.sub, isProfessional);
  }

  // Só o dono da refeição (paciente) ou profissional vinculado pode fazer toggle
  @Patch('meal/:mealId/toggle')
  toggleMealStatus(@Request() req, @Param('mealId') mealId: string) {
    return this.dietPlansService.toggleMealStatus(mealId, req.user.sub, req.user.role);
  }

  // Só o criador da dieta pode deletar
  @Roles('NUTRITIONIST', 'ADMIN')
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.dietPlansService.remove(id, req.user.sub);
  }
}