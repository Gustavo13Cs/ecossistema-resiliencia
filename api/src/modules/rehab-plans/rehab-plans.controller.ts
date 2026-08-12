import {
  Controller, Post, Body, Get, Param,
  Patch, Delete, Request, ForbiddenException, UseGuards,
} from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { CreateRehabPlanDto } from './dto/create-rehab-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rehab-plans')
export class RehabPlansController {
  constructor(private readonly service: RehabPlansService) {}

  @Roles('PHYSIO', 'ADMIN')
  @Post()
  create(@Request() req, @Body() dto: CreateRehabPlanDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Roles('PHYSIO', 'ADMIN')
  @Get()
  findAll(@Request() req) {
    return this.service.findAllByProfessional(req.user.sub);
  }

  // templates antes de :id para evitar conflito de rotas
  @Roles('PHYSIO', 'ADMIN')
  @Get('templates')
  listTemplates(@Request() req) {
    return this.service.listTemplates(req.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(@Request() req, @Param('userId') userId: string) {
    const isProfessional = ['PHYSIO', 'ADMIN'].includes(req.user.role);
    if (!isProfessional && req.user.sub !== userId) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.service.findActiveByUser(userId);
  }

  @Roles('PHYSIO', 'ADMIN')
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(id, req.user.sub);
  }

  @Roles('PHYSIO', 'ADMIN')
  @Patch(':id/save-as-template')
  saveAsTemplate(@Request() req, @Param('id') id: string) {
    return this.service.saveAsTemplate(id, req.user.sub);
  }
}