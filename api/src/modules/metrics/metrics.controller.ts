import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard) 
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard') 
  getDashboard() {
    return this.metricsService.getCompanyDashboard();
  }
}