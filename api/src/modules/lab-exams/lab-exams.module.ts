import { Module } from '@nestjs/common';
import { LabExamsService } from './lab-exams.service';
import { LabExamsController } from './lab-exams.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [LabExamsController],
  providers: [LabExamsService, PrismaService],
})
export class LabExamsModule {}