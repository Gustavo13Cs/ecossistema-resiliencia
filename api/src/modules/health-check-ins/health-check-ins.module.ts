import { Module } from '@nestjs/common';
import { PatientAccessModule } from '../../common/patient-access/patient-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { ConsentsModule } from '../consents/consents.module';
import { HealthCheckInsController } from './health-check-ins.controller';
import { HealthCheckInsService } from './health-check-ins.service';

@Module({
  imports: [DatabaseModule, PatientAccessModule, ConsentsModule],
  controllers: [HealthCheckInsController],
  providers: [HealthCheckInsService],
  exports: [HealthCheckInsService],
})
export class HealthCheckInsModule {}
