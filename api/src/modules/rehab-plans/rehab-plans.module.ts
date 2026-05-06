import { Module } from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { RehabPlansController } from './rehab-plans.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [RehabPlansController],
  providers: [RehabPlansService, PrismaService],
})
export class RehabPlansModule {}