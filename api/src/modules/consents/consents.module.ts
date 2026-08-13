import { Module } from '@nestjs/common';
import { PatientAccessModule } from '../../common/patient-access/patient-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

@Module({
  imports: [DatabaseModule, PatientAccessModule],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
