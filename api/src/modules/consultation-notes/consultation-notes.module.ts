import { Module } from '@nestjs/common';
import { ConsultationNotesService } from './consultation-notes.service';
import { ConsultationNotesController } from './consultation-notes.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [ConsultationNotesController],
  providers: [ConsultationNotesService, PrismaService],
  exports: [ConsultationNotesService],
})
export class ConsultationNotesModule {}
