import { Module } from '@nestjs/common';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { ExerciseDemonstrationService } from './exercise-demonstration.service';
import { ExerciseLibraryService } from './exercise-library.service';
import { TrainingAnamnesesController } from './training-anamneses.controller';
import { TrainingAnamnesesService } from './training-anamneses.service';
import { TrainingReadService } from './training-read.service';
import { WorkoutDraftsController } from './workout-drafts.controller';
import { WorkoutDraftsService } from './workout-drafts.service';
import { WorkoutTemplatesController } from './workout-templates.controller';
import { WorkoutTemplatesService } from './workout-templates.service';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [
    WorkoutDraftsController,
    WorkoutTemplatesController,
    TrainingAnamnesesController,
    WorkoutsController,
  ],
  providers: [
    WorkoutTemplatesService,
    TrainingAnamnesesService,
    ExerciseDemonstrationService,
    WorkoutDraftsService,
    WorkoutsService,
    TrainingReadService,
    ExerciseLibraryService,
  ],
})
export class WorkoutsModule {}
