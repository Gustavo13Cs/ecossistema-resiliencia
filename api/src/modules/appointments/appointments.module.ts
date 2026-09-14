import { Module } from '@nestjs/common';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
