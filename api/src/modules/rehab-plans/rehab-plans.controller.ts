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
import { AuthUser } from '../../common/types/auth-user';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans')
export class RehabPlansController {
  constructor(private readonly service: RehabPlansService) {}

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateRehabPlanDto,
  ) {
    return this.service.create(request.user.sub, dto);
  }

  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.service.findAllByProfessional(request.user.sub);
  }

  // templates antes de :id para evitar conflito de rotas
  @Get('templates')
  listTemplates(@Request() request: AuthenticatedRequest) {
    return this.service.listTemplates(request.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(@Param('userId') userId: string) {
    return this.service.findActiveByUser(userId);
  }

  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.remove(id, request.user.sub);
  }

  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.saveAsTemplate(id, request.user.sub);
  }
}
