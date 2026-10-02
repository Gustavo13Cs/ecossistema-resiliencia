import { Module } from '@nestjs/common';
import { ConsultationNotesService } from './consultation-notes.service';
import { ConsultationNotesController } from './consultation-notes.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [ConsultationNotesController],
  providers: [ConsultationNotesService],
  exports: [ConsultationNotesService],
})
export class ConsultationNotesModule {}
