import { Global, Module } from '@nestjs/common';
import { ObservabilityController } from './observability.controller';
import { RequestMetricsService } from './request-metrics.service';
import { RequestTelemetryLogger } from './request-telemetry.logger';
import { WebVitalsMetricsService } from './web-vitals-metrics.service';
import { WebVitalsController } from './web-vitals.controller';

@Global()
@Module({
  controllers: [ObservabilityController, WebVitalsController],
  providers: [
    RequestTelemetryLogger,
    RequestMetricsService,
    WebVitalsMetricsService,
  ],
  exports: [
    RequestTelemetryLogger,
    RequestMetricsService,
    WebVitalsMetricsService,
  ],
})
export class ObservabilityModule {}
