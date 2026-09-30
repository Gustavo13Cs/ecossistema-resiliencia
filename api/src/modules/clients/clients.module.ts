import { Module } from '@nestjs/common';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientOverviewService } from './client-overview.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientOverviewService],
  exports: [ClientsService, ClientOverviewService],
})
export class ClientsModule {}
