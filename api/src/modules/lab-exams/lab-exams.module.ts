// api/src/modules/lab-exams/lab-exams.module.ts

import { Module } from '@nestjs/common';
import { LabExamsService } from './lab-exams.service';
import { LabExamsController } from './lab-exams.controller';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LabExamsController],
  providers: [LabExamsService],
})
export class LabExamsModule {}