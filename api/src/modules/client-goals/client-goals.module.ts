import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { ClientGoalsController } from './client-goals.controller';
import { ClientGoalsService } from './client-goals.service';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [ClientGoalsController],
  providers: [ClientGoalsService],
})
export class ClientGoalsModule {}
