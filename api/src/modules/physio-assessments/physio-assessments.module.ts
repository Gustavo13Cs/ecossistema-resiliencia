import { Module } from '@nestjs/common';
import { PhysioAssessmentsService } from './physio-assessments.service';
import { PhysioAssessmentsController } from './physio-assessments.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [PhysioAssessmentsController],
  providers: [PhysioAssessmentsService],
})
export class PhysioAssessmentsModule {}
