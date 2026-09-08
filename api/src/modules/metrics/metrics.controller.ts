import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.sharedAssessment)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('checkin')
  async createCheckIn(
    @Body('patientId') patientId: string,
    @Body('type') type: string,
    @Body('itemName') itemName: string,
  ) {
    return this.metricsService.registerCheckIn(patientId, type, itemName);
  }

  @Get('consistency/:patientId')
  async getConsistency(@Param('patientId') patientId: string) {
    return this.metricsService.getWeeklyConsistency(patientId);
  }

  @Get('today/:patientId')
  async getTodayCheckIns(@Param('patientId') patientId: string) {
    return this.metricsService.getTodayLogs(patientId);
  }
}
