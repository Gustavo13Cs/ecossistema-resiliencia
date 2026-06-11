import { Module } from '@nestjs/common';
import { AnamnesesService } from './anamneses.service';
import { AnamnesesController } from './anamneses.controller';
import { PrismaService } from '../../infra/database/prisma.service';

@Module({
  controllers: [AnamnesesController],
  providers: [AnamnesesService, PrismaService],
})
export class AnamnesesModule {}