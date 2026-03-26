// api/src/modules/metrics/metrics.controller.ts

import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  getDashboard(@Request() req) {
    const userId = req.user.sub;
    const role = req.user.role; 
    
    return this.metricsService.getDashboard(userId, role);
  }
}