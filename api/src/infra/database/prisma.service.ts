import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbUrl = process.env.DATABASE_URL as string;
    
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool as any); 
    
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🟢 Banco de Dados Conectado com Sucesso!');
  }
}