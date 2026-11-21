import { Global, Module } from '@nestjs/common';
import { ObservabilityController } from './observability.controller';
import { RequestMetricsService } from './request-metrics.service';
import { RequestTelemetryLogger } from './request-telemetry.logger';

@Global()
@Module({
  controllers: [ObservabilityController],
  providers: [RequestTelemetryLogger, RequestMetricsService],
  exports: [RequestTelemetryLogger, RequestMetricsService],
})
export class ObservabilityModule {}
