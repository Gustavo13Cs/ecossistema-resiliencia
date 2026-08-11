import { Module } from '@nestjs/common';
import { MealLogsService } from './meal-logs.service';
import { MealLogsController } from './meal-logs.controller';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MealLogsController],
  providers: [MealLogsService],
})
export class MealLogsModule {}
