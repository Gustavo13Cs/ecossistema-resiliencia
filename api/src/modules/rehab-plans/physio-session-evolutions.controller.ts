import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import {
  CreatePhysioSessionEvolutionDto,
  UpdatePhysioSessionEvolutionDto,
} from './dto/physio-session-evolution.dto';
import { PhysioSessionEvolutionsService } from './physio-session-evolutions.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans/evolutions')
export class PhysioSessionEvolutionsController {
  constructor(
    private readonly evolutionsService: PhysioSessionEvolutionsService,
  ) {}

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  listByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.evolutionsService.listByClient(request.user, clientId);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('appointment/:appointmentId')
  findByAppointment(
    @Request() request: AuthenticatedRequest,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.evolutionsService.findByAppointment(
      request.user,
      appointmentId,
    );
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreatePhysioSessionEvolutionDto,
  ) {
    return this.evolutionsService.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhysioSessionEvolutionDto,
  ) {
    return this.evolutionsService.update(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.evolutionsService.remove(request.user, id);
  }
}
