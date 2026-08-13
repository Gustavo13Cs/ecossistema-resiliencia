// api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from './infra/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { DietPlansModule } from './modules/diet-plans/diet-plans.module';
import { FoodsModule } from './modules/foods/foods.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { PhysioAssessmentsModule } from './modules/physio-assessments/physio-assessments.module';
import { RehabPlansModule } from './modules/rehab-plans/rehab-plans.module';
import { AnamnesesModule } from './modules/anamneses/anamneses.module';
import { SupplementsModule } from './modules/supplements/supplements.module';
import { LabExamsModule } from './modules/lab-exams/lab-exams.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { WorkoutLogsModule } from './modules/workout-logs/workout-logs.module';
import { MealLogsModule } from './modules/meal-logs/meal-logs.module';
import { PatientAccessModule } from './common/patient-access/patient-access.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { HealthCheckInsModule } from './modules/health-check-ins/health-check-ins.module';
import { AppController } from '../app.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 20,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
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
    LabExamsModule,
    AlertsModule,
    WorkoutLogsModule,
    MealLogsModule,
    PatientAccessModule,
    ConsentsModule,
    AgendaModule,
    HealthCheckInsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
