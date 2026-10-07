import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaService } from '../../src/infra/database/prisma.service';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { assertIsolationDatabase } from './client-isolation';

export async function isolatedPostgres(
  options: { beforeTenant?: boolean } = {},
) {
  assertIsolationDatabase();
  const port = Number(process.env.LOCAL_TEST_PG_PORT ?? '5434');
  if (![5434, 5435].includes(port))
    throw new Error('Synthetic fixture port must be 5434 or 5435');
  const name = `safemove_security_${randomUUID().replaceAll('-', '')}`;
  if (!/^safemove_security_[a-f0-9]{32}$/.test(name))
    throw new Error('Invalid fixture database');
  const admin = new Pool({
    connectionString: `postgresql://postgres:postgres@localhost:${port}/postgres`,
  });
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = `postgresql://postgres:postgres@localhost:${port}/${name}`;
  const pool = new Pool({ connectionString: url });
  let prisma: PrismaService | undefined;
  const close = async () => {
    await prisma?.$disconnect();
    await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
    await admin.end();
  };
  try {
    const migrations = resolve(__dirname, '../../prisma/migrations');
    for (const migration of readdirSync(migrations).sort()) {
      if (
        options.beforeTenant &&
        migration >= '20261006120000_read_audit_tenant_roles'
      )
        continue;
      const path = resolve(migrations, migration, 'migration.sql');
      if (existsSync(path)) await pool.query(readFileSync(path, 'utf8'));
    }
    const previous = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = url;
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url }),
      }) as unknown as PrismaService;
    } finally {
      process.env.DATABASE_URL = previous;
    }
    await prisma.$connect();
    return { prisma, pool, close, port };
  } catch (error) {
    await close();
    throw error;
  }
}
