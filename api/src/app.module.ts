import { Module } from '@nestjs/common';
import { DatabaseModule } from './infra/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { DietPlansModule } from './modules/diet-plans/diet-plans.module';
import { FoodsModule } from './modules/foods/foods.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { PhysioAssessmentsModule } from './modules/physio-assessments/physio-assessments.module';
import { RehabPlansModule } from './modules/rehab-plans/rehab-plans.module';
import { AppController } from '../app.controller';
import { AnamnesesModule } from './modules/anamneses/anamneses.module';
import { SupplementsModule } from './modules/supplements/supplements.module';
import { LabExamsModule } from './modules/lab-exams/lab-exams.module';

@Module({
  imports: [
    AuthModule, 
    UsersModule, 
    WorkoutsModule, 
    MetricsModule,
    DietPlansModule,
    FoodsModule,
    AssessmentsModule,
    PhysioAssessmentsModule,
    RehabPlansModule,
    AnamnesesModule,
    SupplementsModule,
    LabExamsModule
  ],
  controllers: [AppController]
})
export class AppModule {}