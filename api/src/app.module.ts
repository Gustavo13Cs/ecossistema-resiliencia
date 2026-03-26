import { Module } from '@nestjs/common';
import { DatabaseModule } from './infra/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [DatabaseModule, UsersModule, AuthModule, WorkoutsModule, MetricsModule], 
  controllers: [],
  providers: [],
})
export class AppModule {}