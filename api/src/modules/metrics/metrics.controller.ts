import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { CreateMetricCheckInDto } from './dto/create-metric-check-in.dto';
import { MetricsService } from './metrics.service';

type AuthenticatedRequest = { user: AuthUser };

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('checkin')
  @Roles('PATIENT')
  async createCheckIn(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateMetricCheckInDto,
  ) {
    return this.metricsService.registerCheckIn(request.user, dto);
  }

  @Get('consistency/:patientId')
  @Roles('PATIENT', ...CLINICAL_PROFESSIONAL_ROLES)
  async getConsistency(
    @Request() request: AuthenticatedRequest,
    @Param('patientId') patientId: string,
  ) {
    return this.metricsService.getWeeklyConsistency(request.user, patientId);
  }

  @Get('today/:patientId')
  @Roles('PATIENT', ...CLINICAL_PROFESSIONAL_ROLES)
  async getTodayCheckIns(
    @Request() request: AuthenticatedRequest,
    @Param('patientId') patientId: string,
  ) {
    return this.metricsService.getTodayLogs(request.user, patientId);
  }
}
