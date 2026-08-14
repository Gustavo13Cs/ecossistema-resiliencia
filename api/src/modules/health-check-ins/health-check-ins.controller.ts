import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthUser,
  CLINICAL_PROFESSIONAL_ROLES,
} from '../../common/types/auth-user';
import { AgendaRangeQueryDto } from '../agenda/dto/agenda-range-query.dto';
import { CreateHealthCheckInDto } from './dto/create-health-check-in.dto';
import { HealthCheckInsService } from './health-check-ins.service';

type AuthenticatedRequest = { user: AuthUser };

@Controller('health-check-ins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthCheckInsController {
  constructor(private readonly healthCheckInsService: HealthCheckInsService) {}

  @Post()
  @Roles('PATIENT')
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateHealthCheckInDto,
  ) {
    return this.healthCheckInsService.create(request.user, dto);
  }

  @Get('patient/:patientId')
  @Roles('PATIENT', ...CLINICAL_PROFESSIONAL_ROLES)
  listForPatient(
    @Request() request: AuthenticatedRequest,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: AgendaRangeQueryDto,
  ) {
    return this.healthCheckInsService.listForPatient(request.user, patientId, {
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }
}
