import { Module } from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { SupplementsController } from './supplements.controller';
import { PrismaService } from '../../infra/database/prisma.service';
@Module({ controllers: [SupplementsController], providers: [SupplementsService, PrismaService] })
export class SupplementsModule {}