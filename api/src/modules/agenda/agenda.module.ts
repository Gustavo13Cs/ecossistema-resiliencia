import { Module } from '@nestjs/common';
import { PatientAccessModule } from '../../common/patient-access/patient-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { AgendaController } from './agenda.controller';
import { AgendaScheduler } from './agenda.scheduler';
import { AgendaService } from './agenda.service';

@Module({
  imports: [DatabaseModule, PatientAccessModule],
  controllers: [AgendaController],
  providers: [AgendaService, AgendaScheduler],
  exports: [AgendaService],
})
export class AgendaModule {}
