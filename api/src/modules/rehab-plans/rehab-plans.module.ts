import { Module } from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { RehabPlansController } from './rehab-plans.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [RehabPlansController],
  providers: [RehabPlansService],
})
export class RehabPlansModule {}
