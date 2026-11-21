import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ClinicalResponse } from '../decorators/clinical-response.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { PerformanceMetricsQueryDto } from './dto/performance-metrics-query.dto';
import { WebVitalsQueryDto } from './dto/web-vitals.dto';
import {
  type PerformanceMetricsSnapshot,
  RequestMetricsService,
} from './request-metrics.service';
import {
  WebVitalsMetricsService,
  type WebVitalsSnapshot,
} from './web-vitals-metrics.service';

@Controller('observability')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class ObservabilityController {
  constructor(
    private readonly metrics: RequestMetricsService,
    private readonly webVitals: WebVitalsMetricsService,
  ) {}

  @Get('performance')
  @Header('Cache-Control', 'no-store')
  @ClinicalResponse({ exception: 'observability' })
  getPerformance(
    @Query() query: PerformanceMetricsQueryDto,
  ): PerformanceMetricsSnapshot {
    return this.metrics.getSnapshot(query.top);
  }

  @Get('web-vitals')
  @Header('Cache-Control', 'no-store')
  @ClinicalResponse({ exception: 'observability' })
  getWebVitals(@Query() query: WebVitalsQueryDto): WebVitalsSnapshot {
    return this.webVitals.getSnapshot({
      route: query.route,
      device: query.device,
      top: query.top,
    });
  }
}
