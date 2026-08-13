import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infra/database/prisma.service';
import { AgendaService } from './agenda.service';

const THIRTY_DAYS_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AgendaScheduler {
  constructor(
    private readonly agendaService: AgendaService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 5 1 * * *', { timeZone: 'UTC' })
  async processDailyAgenda(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + THIRTY_DAYS_MILLISECONDS);

    await this.agendaService.materializeActiveTasks(now, windowEnd);
    await this.prisma.agendaTaskOccurrence.updateMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
  }
}
