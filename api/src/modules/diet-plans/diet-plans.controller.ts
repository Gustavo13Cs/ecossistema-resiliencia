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
import { DietPlansService } from './diet-plans.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthUser } from '../../common/types/auth-user';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('diet-plans')
export class DietPlansController {
  constructor(private readonly dietPlansService: DietPlansService) {}

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createDietDto: CreateDietPlanDto,
  ) {
    return this.dietPlansService.create(createDietDto, request.user.sub);
  }

  // Lista dietas criadas pelo profissional logado
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.dietPlansService.findAll(request.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(
    @Request() request: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.dietPlansService.findActiveByUser(userId, request.user.sub);
  }

  // Histórico completo de dietas do paciente (ativas + inativas)
  @Get('user/:userId/history')
  findAllByPatient(
    @Request() request: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.dietPlansService.findAllByPatient(userId, request.user.sub);
  }

  @Get('client/:clientId/active')
  findActiveByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.dietPlansService.findActiveByClient(clientId, request.user.sub);
  }

  @Get('client/:clientId/history')
  findAllByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.dietPlansService.findAllByClient(clientId, request.user.sub);
  }

  @Patch('meal/:mealId/toggle')
  toggleMealStatus(
    @Request() request: AuthenticatedRequest,
    @Param('mealId') mealId: string,
  ) {
    return this.dietPlansService.toggleMealStatus(mealId, request.user.sub);
  }

  // Só o criador da dieta pode deletar
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.dietPlansService.remove(id, request.user.sub);
  }

  // Salvar um plano existente como template reutilizável
  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.dietPlansService.saveAsTemplate(id, request.user.sub);
  }

  // Listar todos os templates do profissional logado (com refeições completas para pré-preencher)
  @Get('templates')
  listTemplates(@Request() request: AuthenticatedRequest) {
    return this.dietPlansService.listTemplates(request.user.sub);
  }
}
