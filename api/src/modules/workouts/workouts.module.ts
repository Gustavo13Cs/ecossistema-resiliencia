import { Module } from '@nestjs/common';
import { WorkoutDraftsController } from './workout-drafts.controller';
import { WorkoutDraftsService } from './workout-drafts.service';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { TrainingReadService } from './training-read.service';
import { ExerciseLibraryService } from './exercise-library.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [WorkoutDraftsController, WorkoutsController],
  providers: [
    WorkoutDraftsService,
    WorkoutsService,
    TrainingReadService,
    ExerciseLibraryService,
  ],
})
export class WorkoutsModule {}
