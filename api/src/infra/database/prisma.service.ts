import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  [x: string]: any;
  constructor() {
    const dbUrl = process.env.DATABASE_URL as string;

    const pool = new Pool({ connectionString: dbUrl });
    const adapterPool = pool as unknown as ConstructorParameters<
      typeof PrismaPg
    >[0];
    const adapter = new PrismaPg(adapterPool, { disposeExternalPool: true });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🟢 Banco de Dados Conectado com Sucesso!');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
