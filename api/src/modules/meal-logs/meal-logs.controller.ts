import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { MealLogsService } from './meal-logs.service';
import { CreateMealLogDto } from './dto/create-meal-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meal-logs')
export class MealLogsController {
  constructor(private readonly mealLogsService: MealLogsService) {}

  // Paciente registra adesão a uma refeição
  @Roles('PATIENT')
  @Post()
  create(@Request() req, @Body() dto: CreateMealLogDto) {
    return this.mealLogsService.create(req.user.sub, dto);
  }

  // Paciente ou Nutricionista vê o histórico de logs
  @Get('patient/:patientId')
  findByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.mealLogsService.findByPatient(patientId, req.user.sub, req.user.role);
  }

  // Nutricionista consulta taxa de adesão de uma refeição específica
  @Roles('NUTRITIONIST', 'ADMIN')
  @Get('meal/:mealId/stats')
  getMealStats(@Request() req, @Param('mealId') mealId: string) {
    return this.mealLogsService.getMealStats(mealId, req.user.sub);
  }
}
