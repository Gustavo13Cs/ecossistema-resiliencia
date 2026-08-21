import { Module } from '@nestjs/common';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
