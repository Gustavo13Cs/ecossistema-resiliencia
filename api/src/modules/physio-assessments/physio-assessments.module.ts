import { Module } from '@nestjs/common';
import { PhysioAssessmentsService } from './physio-assessments.service';
import { PhysioAssessmentsController } from './physio-assessments.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [PhysioAssessmentsController],
  providers: [PhysioAssessmentsService, PrismaService],
})
export class PhysioAssessmentsModule {} 