import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL is required');
    const adapter = new PrismaPg({ connectionString: dbUrl });

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
