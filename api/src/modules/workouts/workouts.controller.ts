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
import { AuthUser } from '../../common/types/auth-user';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.training)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createWorkoutDto: CreateWorkoutDto,
  ) {
    return this.workoutsService.create(request.user.sub, createWorkoutDto);
  }

  // Lista treinos criados pelo profissional logado
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.workoutsService.findAllByProfessional(request.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(
    @Request() request: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.workoutsService.findActiveByUser(
      userId,
      request.user.sub,
      true,
    );
  }

  // Só o criador do treino pode deletar
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workoutsService.remove(id, request.user.sub);
  }

  // Salvar um treino existente como template reutilizável
  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.workoutsService.saveAsTemplate(id, request.user.sub);
  }

  // Listar todos os templates do personal logado (com splits e exercícios para pré-preencher)
  @Get('templates')
  listTemplates(@Request() request: AuthenticatedRequest) {
    return this.workoutsService.listTemplates(request.user.sub);
  }
}
