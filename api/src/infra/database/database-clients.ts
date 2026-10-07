import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

export function databaseClient(variable: string): PrismaClient {
  const url = process.env[variable];
  if (!url)
    throw new Error(variable + ' is required; use a separate database role');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export async function assertDatabaseRole(
  client: Pick<PrismaClient, '$queryRaw'>,
  group: string,
) {
  const rows = await client.$queryRaw<Array<{ safe: boolean }>>`
    SELECT bool_and(NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication
      AND pg_has_role(r.rolname, ${group}, 'MEMBER') AND pg_has_role(r.rolname, ${group}, 'USAGE')
      AND NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p')
          AND pg_has_role(r.rolname,c.relowner,'MEMBER')
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_roles p WHERE (p.rolsuper OR p.rolbypassrls OR p.rolcreaterole OR p.rolcreatedb OR p.rolreplication)
          AND pg_has_role(r.rolname,p.oid,'MEMBER')
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_roles p WHERE p.rolname IN
          ('safemove_clinical','safemove_auth','safemove_jobs','safemove_catalog_lookup','safemove_audit_delivery')
          AND p.rolname <> ${group} AND pg_has_role(r.rolname,p.oid,'MEMBER')
      )) AS safe
    FROM pg_roles r WHERE r.rolname IN (current_user,session_user)
  `;
  if (rows.length !== 1 || !rows[0].safe)
    throw new Error('Unsafe database role for ' + group);
}

@Injectable()
export class AuthPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.AUTH_DATABASE_URL;
    if (!url) throw new Error('AUTH_DATABASE_URL is required');
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }
  async onModuleInit() {
    await this.$connect();
    await assertDatabaseRole(this, 'safemove_auth');
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Injectable()
export class JobsPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.JOBS_DATABASE_URL;
    if (!url) throw new Error('JOBS_DATABASE_URL is required');
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }
  async onModuleInit() {
    await this.$connect();
    await assertDatabaseRole(this, 'safemove_jobs');
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
