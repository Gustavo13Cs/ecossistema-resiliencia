import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsCronService } from './alerts.cron.service';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AlertsController],
  providers: [AlertsCronService],
})
export class AlertsModule {}
