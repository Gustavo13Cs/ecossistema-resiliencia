import { Module } from '@nestjs/common';
import { DietPlansService } from './diet-plans.service';
import { DietPlansController } from './diet-plans.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [DietPlansController],
  providers: [DietPlansService, PrismaService],
})
export class DietPlansModule {}