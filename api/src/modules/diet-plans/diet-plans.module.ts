import { Module } from '@nestjs/common';
import { DietPlansService } from './diet-plans.service';
import { DietPlansController } from './diet-plans.controller';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DietPlansController],
  providers: [DietPlansService],
})
export class DietPlansModule {}