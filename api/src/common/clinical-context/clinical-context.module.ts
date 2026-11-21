import { Module } from '@nestjs/common';
import {
  APP_INTERCEPTOR,
  DiscoveryModule,
  MetadataScanner,
} from '@nestjs/core';
import { ClinicalResponseValidator } from './clinical-response.validator';
import { ClinicalContextInterceptor } from './clinical-context.interceptor';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [DiscoveryModule, ObservabilityModule],
  providers: [
    ClinicalResponseValidator,
    MetadataScanner,
    ClinicalContextInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: ClinicalContextInterceptor },
  ],
})
export class ClinicalContextModule {}
