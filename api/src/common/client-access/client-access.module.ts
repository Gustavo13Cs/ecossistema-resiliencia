import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessService } from './client-access.service';

@Module({
  imports: [DatabaseModule],
  providers: [ClientAccessService],
  exports: [ClientAccessService],
})
export class ClientAccessModule {}
