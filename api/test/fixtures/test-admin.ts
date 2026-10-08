import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '../../src/infra/database/prisma.service';
import { assertIsolationDatabase, isolationDatabase } from './client-isolation';

export function testAdminPrisma(): PrismaService {
  assertIsolationDatabase();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: isolationDatabase }),
  }) as unknown as PrismaService;
}
