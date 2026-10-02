import { Module } from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { SupplementsController } from './supplements.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [SupplementsController],
  providers: [SupplementsService],
})
export class SupplementsModule {}
