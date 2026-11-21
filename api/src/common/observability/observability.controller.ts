import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ClinicalResponse } from '../decorators/clinical-response.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { PerformanceMetricsQueryDto } from './dto/performance-metrics-query.dto';
import {
  type PerformanceMetricsSnapshot,
  RequestMetricsService,
} from './request-metrics.service';

@Controller('observability')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class ObservabilityController {
  constructor(private readonly metrics: RequestMetricsService) {}

  @Get('performance')
  @Header('Cache-Control', 'no-store')
  @ClinicalResponse({ exception: 'observability' })
  getPerformance(
    @Query() query: PerformanceMetricsQueryDto,
  ): PerformanceMetricsSnapshot {
    return this.metrics.getSnapshot(query.top);
  }
}
