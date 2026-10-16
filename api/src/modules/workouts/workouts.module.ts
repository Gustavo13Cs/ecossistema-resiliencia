import { Module } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { TrainingReadService } from './training-read.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService, TrainingReadService],
})
export class WorkoutsModule {}
