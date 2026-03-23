import { Module } from '@nestjs/common';
import { DatabaseModule } from './infra/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';

@Module({
  imports: [DatabaseModule, UsersModule, AuthModule, WorkoutsModule], 
  controllers: [],
  providers: [],
})
export class AppModule {}