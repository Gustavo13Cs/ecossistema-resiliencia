import { Module } from '@nestjs/common';
import { DatabaseModule } from './infra/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { DietPlansModule } from './modules/diet-plans/diet-plans.module';
import { FoodsModule } from './modules/foods/foods.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';

@Module({
  imports: [
    AuthModule, 
    UsersModule, 
    WorkoutsModule, 
    MetricsModule,
    DietPlansModule,
    FoodsModule,
    AssessmentsModule
  ],
})
export class AppModule {}