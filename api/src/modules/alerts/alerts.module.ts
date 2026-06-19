import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsCronService } from './alerts.cron.service';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsCronService, PrismaService],
})
export class AlertsModule {}