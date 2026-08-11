import { Module } from '@nestjs/common';
import { WorkoutLogsService } from './workout-logs.service';
import { WorkoutLogsController } from './workout-logs.controller';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkoutLogsController],
  providers: [WorkoutLogsService],
})
export class WorkoutLogsModule {}
