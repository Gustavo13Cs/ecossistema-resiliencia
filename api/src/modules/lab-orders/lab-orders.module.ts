import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';
import { LabOrdersController } from './lab-orders.controller';
import { LabOrdersService } from './lab-orders.service';
@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [LabOrdersController],
  providers: [LabOrdersService],
})
export class LabOrdersModule {}
