// api/src/infra/database/database.module.ts

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthPrismaService, JobsPrismaService } from './database-clients';

@Global()
@Module({
  providers: [PrismaService, AuthPrismaService, JobsPrismaService],
  exports: [PrismaService, AuthPrismaService, JobsPrismaService],
})
export class DatabaseModule {}
