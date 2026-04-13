import { Module } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService, PrismaService],
})
export class WorkoutsModule {}