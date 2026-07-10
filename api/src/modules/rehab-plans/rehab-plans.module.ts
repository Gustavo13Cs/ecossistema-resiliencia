// api/src/modules/rehab-plans/rehab-plans.module.ts

import { Module } from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { RehabPlansController } from './rehab-plans.controller';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RehabPlansController],
  providers: [RehabPlansService],
})
export class RehabPlansModule {}