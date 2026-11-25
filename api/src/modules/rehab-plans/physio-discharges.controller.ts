import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
  CreatePhysioDischargeDto,
  PhysioReportsQueryDto,
} from './dto/physio-discharge.dto';
import { PhysioDischargesService } from './physio-discharges.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans/discharges')
export class PhysioDischargesController {
  constructor(private readonly service: PhysioDischargesService) {}

  @ClinicalResponse({ shape: 'resource-page' })
  @Get('reports')
  getManagementReport(
    @Request() request: AuthenticatedRequest,
    @Query() query: PhysioReportsQueryDto,
  ) {
    return this.service.getManagementReport(request.user, query);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  listByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.service.listByClient(request.user, clientId);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreatePhysioDischargeDto,
  ) {
    return this.service.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(request.user, id);
  }
}
