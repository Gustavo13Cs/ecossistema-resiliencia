// api/src/modules/workouts/workouts.controller.ts

import {
  Controller, Post, Body, Get, Param,
  Patch, Delete, Request, ForbiddenException, UseGuards,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // Só personal e admin criam treinos
  @Roles('PERSONAL', 'ADMIN')
  @Post()
  create(@Request() req, @Body() createWorkoutDto: CreateWorkoutDto) {
    return this.workoutsService.create(req.user.sub, createWorkoutDto);
  }

  // Lista treinos criados pelo profissional logado
  @Roles('PERSONAL', 'ADMIN')
  @Get()
  findAll(@Request() req) {
    return this.workoutsService.findAllByProfessional(req.user.sub);
  }

  // Paciente só vê o próprio treino ativo; profissional vê de paciente vinculado
  @Get('user/:userId/active')
  findActiveByUser(@Request() req, @Param('userId') userId: string) {
    const isProfessional = ['PERSONAL', 'ADMIN'].includes(req.user.role);

    if (!isProfessional && req.user.sub !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.workoutsService.findActiveByUser(userId, req.user.sub, isProfessional);
  }

  // Só o criador do treino pode deletar
  @Roles('PERSONAL', 'ADMIN')
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.workoutsService.remove(id, req.user.sub);
  }

  // Salvar um treino existente como template reutilizável
  @Roles('PERSONAL', 'ADMIN')
  @Patch(':id/save-as-template')
  saveAsTemplate(@Request() req, @Param('id') id: string) {
    return this.workoutsService.saveAsTemplate(id, req.user.sub);
  }

  // Listar todos os templates do personal logado (com splits e exercícios para pré-preencher)
  @Roles('PERSONAL', 'ADMIN')
  @Get('templates')
  listTemplates(@Request() req) {
    return this.workoutsService.listTemplates(req.user.sub);
  }
}