import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
// api/src/modules/workouts/workouts.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.training)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @ClinicalResponse({ domain: 'WORKOUT', shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createWorkoutDto: CreateWorkoutDto,
  ) {
    return this.workoutsService.create(request.user, createWorkoutDto);
  }

  // Lista treinos criados pelo profissional logado
  @ClinicalResponse({ domain: 'WORKOUT', shape: 'resource' })
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.workoutsService.findAllByProfessional(request.user);
  }

  @ClinicalResponse({ domain: 'WORKOUT', shape: 'resource' })
  @Get('client/:clientId/active')
  findActive(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.workoutsService.findActive(request.user, clientId);
  }

  // Só o criador do treino pode deletar
  @ClinicalResponse({ domain: 'WORKOUT', shape: 'resource' })
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workoutsService.remove(request.user, id);
  }

  // Salvar um treino existente como template reutilizável
  @ClinicalResponse({
    domain: 'WORKOUT',
    shape: 'ack',
    lookup: 'workout',
    parameter: 'id',
  })
  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.workoutsService.saveAsTemplate(request.user, id);
  }

  // Listar todos os templates do personal logado (com splits e exercícios para pré-preencher)
  @ClinicalResponse({ domain: 'WORKOUT', shape: 'resource' })
  @Get('templates')
  listTemplates(@Request() request: AuthenticatedRequest) {
    return this.workoutsService.listTemplates(request.user);
  }
}
