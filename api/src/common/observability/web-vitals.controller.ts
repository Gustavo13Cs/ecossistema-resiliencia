import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClinicalResponse } from '../decorators/clinical-response.decorator';
import { Public } from '../decorators/public.decorator';
import { ReportWebVitalsBatchDto } from './dto/web-vitals.dto';
import { WebVitalsMetricsService } from './web-vitals-metrics.service';

@Controller('observability/web-vitals')
export class WebVitalsController {
  constructor(private readonly webVitals: WebVitalsMetricsService) {}

  @Post()
  @Public()
  @HttpCode(202)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Header('Cache-Control', 'no-store')
  @ClinicalResponse({ exception: 'observability' })
  report(@Body() body: ReportWebVitalsBatchDto): { accepted: number } {
    return {
      accepted: this.webVitals.recordBatch(body.metrics),
    };
  }
}
