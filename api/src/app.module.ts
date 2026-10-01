// api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from './infra/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { DietPlansModule } from './modules/diet-plans/diet-plans.module';
import { FoodsModule } from './modules/foods/foods.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { PhysioAssessmentsModule } from './modules/physio-assessments/physio-assessments.module';
import { RehabPlansModule } from './modules/rehab-plans/rehab-plans.module';
import { AnamnesesModule } from './modules/anamneses/anamneses.module';
import { SupplementsModule } from './modules/supplements/supplements.module';
import { LabExamsModule } from './modules/lab-exams/lab-exams.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ConsultationNotesModule } from './modules/consultation-notes/consultation-notes.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AppController } from '../app.controller';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { ClientGoalsModule } from './modules/client-goals/client-goals.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    WorkoutsModule,
    DietPlansModule,
    FoodsModule,
    AssessmentsModule,
    PhysioAssessmentsModule,
    RehabPlansModule,
    AnamnesesModule,
    SupplementsModule,
    LabExamsModule,
    AlertsModule,
    ConsultationNotesModule,
    ClientsModule,
    AppointmentsModule,
    RecipesModule,
    ClientGoalsModule,
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
