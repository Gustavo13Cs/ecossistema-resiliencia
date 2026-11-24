import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
// api/src/modules/rehab-plans/rehab-plans.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { PhysioReadService } from './physio-read.service';
import { CreateRehabPlanDto } from './dto/create-rehab-plan.dto';
import {
  CreateRehabTemplateDto,
  PhysioExerciseCatalogQueryDto,
  UpdateRehabPhaseDto,
  UpdateRehabPlanDto,
} from './dto/update-rehab-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans')
export class RehabPlansController {
  constructor(
    private readonly rehabPlansService: RehabPlansService,
    private readonly physioReadService: PhysioReadService,
  ) {}

  @ClinicalResponse({ shape: 'resource-page' })
  @Get('workspace')
  getWorkspace(@Request() request: AuthenticatedRequest) {
    return this.physioReadService.getWorkspace(request.user);
  }

  @ClinicalResponse({ shape: 'overview' })
  @Get('client/:clientId/overview')
  getClientOverview(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.physioReadService.getClientOverview(request.user, clientId);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Get('protocol-catalog')
  getProtocolCatalog(@Request() request: AuthenticatedRequest) {
    return this.rehabPlansService.getProtocolCatalog(request.user);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Get('exercise-catalog')
  getExerciseCatalog(
    @Request() request: AuthenticatedRequest,
    @Query() query: PhysioExerciseCatalogQueryDto,
  ) {
    return this.rehabPlansService.getExerciseCatalog(request.user, query);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post('templates')
  createTemplate(
    @Request() request: AuthenticatedRequest,
    @Body() createRehabTemplateDto: CreateRehabTemplateDto,
  ) {
    return this.rehabPlansService.createTemplate(
      request.user,
      createRehabTemplateDto,
    );
  }

  // Listar todos os templates do fisioterapeuta logado (com sessões e exercícios para pré-preencher)
  @ClinicalResponse({ shape: 'resource' })
  @Get('templates')
  listTemplates(@Request() request: AuthenticatedRequest) {
    return this.rehabPlansService.listTemplates(request.user);
  }

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

  @ClinicalResponse({ shape: 'resource' })
  @Patch(':id/phase')
  updateCurrentPhase(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRehabPhaseDto,
  ) {
    return this.rehabPlansService.updateCurrentPhase(request.user, id, dto);
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

  @ClinicalResponse({ shape: 'resource' })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRehabPlanDto: UpdateRehabPlanDto,
  ) {
    return this.rehabPlansService.update(request.user, id, updateRehabPlanDto);
  }

  // Só o criador do plano de reabilitação pode deletar
  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.rehabPlansService.remove(request.user, id);
  }
}
