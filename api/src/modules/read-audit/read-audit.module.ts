import { Module } from '@nestjs/common';
import {
  APP_INTERCEPTOR,
  DiscoveryModule,
  MetadataScanner,
} from '@nestjs/core';
import { ReadAuditService } from './read-audit.service';
import { ReadAuditController } from './read-audit.controller';
import { ReadAuditInterceptor } from './read-audit.interceptor';

@Module({
  imports: [DiscoveryModule],
  controllers: [ReadAuditController],
  providers: [
    ReadAuditService,
    MetadataScanner,
    ReadAuditInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: ReadAuditInterceptor },
  ],
})
export class ReadAuditModule {}
