import { Module } from '@nestjs/common';
import { PatientAccessModule } from '../../common/patient-access/patient-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [DatabaseModule, PatientAccessModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
