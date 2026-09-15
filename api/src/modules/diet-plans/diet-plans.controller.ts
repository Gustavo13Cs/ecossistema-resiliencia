import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DietPlansService } from './diet-plans.service';
import {
  CreateDietPlanDto,
  CreateDietTemplateDto,
  UpdateDietTemplateDto,
  ScaleAndImportTemplateDto,
} from './dto/create-diet-plan.dto';
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

  // Listar templates do profissional (opções: ?status=all|active|archived)
  @Get('templates')
  listTemplates(
    @Request() request: AuthenticatedRequest,
    @Query('status') status?: 'all' | 'active' | 'archived',
  ) {
    return this.dietPlansService.listTemplates(request.user.sub, status);
  }

  // Templates curados padrão do SafeMove
  @Get('system-templates')
  listSystemTemplates() {
    return this.dietPlansService.getSystemTemplates();
  }

  // Criar novo modelo personalizado do profissional
  @Post('template')
  createTemplate(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateDietTemplateDto,
  ) {
    return this.dietPlansService.createTemplate(dto, request.user.sub);
  }

  // Atualizar modelo personalizado do profissional
  @Put('template/:id')
  updateTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDietTemplateDto,
  ) {
    return this.dietPlansService.updateTemplate(id, dto, request.user.sub);
  }

  // Duplicar modelo (gerar nova versão/cópia)
  @Post('template/:id/duplicate')
  duplicateTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.dietPlansService.duplicateTemplate(id, request.user.sub);
  }

  // Alternar arquivamento do modelo (isActive)
  @Patch('template/:id/archive')
  toggleArchiveTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.dietPlansService.toggleArchiveTemplate(id, request.user.sub);
  }

  // Importar modelo para o prontuário de um cliente com auto-scaling proporcional
  @Post('template/:id/import-to-client')
  importTemplateToClient(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ScaleAndImportTemplateDto,
  ) {
    return this.dietPlansService.importTemplateToClient(
      id,
      dto,
      request.user.sub,
    );
  }

  // Salvar um plano existente como template reutilizável
  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.dietPlansService.saveAsTemplate(id, request.user.sub);
  }

  // Só o criador da dieta pode deletar
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.dietPlansService.remove(id, request.user.sub);
  }
}
