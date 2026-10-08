import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
// api/src/modules/rehab-plans/rehab-plans.controller.ts

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
import { RehabPlansService } from './rehab-plans.service';
import { CreateRehabPlanDto } from './dto/create-rehab-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans')
export class RehabPlansController {
  constructor(private readonly rehabPlansService: RehabPlansService) {}

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createRehabPlanDto: CreateRehabPlanDto,
  ) {
    return this.rehabPlansService.create(request.user, createRehabPlanDto);
  }

  // Lista planos de reabilitação criados pelo profissional logado
  @ClinicalResponse({ shape: 'resource' })
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.rehabPlansService.findAllByProfessional(request.user);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId/active')
  findActive(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.rehabPlansService.findActive(request.user, clientId);
  }

  // Só o criador do plano de reabilitação pode deletar
  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.rehabPlansService.remove(request.user, id);
  }

  // Salvar um plano de reabilitação existente como template reutilizável
  @ClinicalResponse({
    shape: 'ack',
  })
  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.rehabPlansService.saveAsTemplate(request.user, id);
  }

  // Listar todos os templates do fisioterapeuta logado (com sessões e exercícios para pré-preencher)
  @ClinicalResponse({ shape: 'resource' })
  @Get('templates')
  listTemplates(@Request() request: AuthenticatedRequest) {
    return this.rehabPlansService.listTemplates(request.user);
  }
}
