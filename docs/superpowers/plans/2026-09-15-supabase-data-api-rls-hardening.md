# Supabase Data API and Defensive RLS Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a Data API do Supabase, tornar grants públicos opt-in e aplicar RLS restritivo nas 33 tabelas físicas de aplicação sem alterar o fluxo NestJS/Prisma.

**Architecture:** O navegador continuará falando somente com a API NestJS, e o Prisma continuará usando a conexão PostgreSQL existente. Uma migration Prisma aplicará RLS deny-by-default e revogará privilégios atuais e futuros das roles da Data API; testes de contrato e de catálogo PostgreSQL provarão a configuração. A mudança operacional da Data API será feita somente depois dos gates locais e de uma confirmação final de produção.

**Tech Stack:** PostgreSQL 16/17, Supabase, Prisma 7.10, NestJS 11, Jest 30, `pg` 8.20, PowerShell.

**Spec:** `docs/superpowers/specs/2026-09-15-supabase-data-api-rls-hardening-design.md`

## Global Constraints

- Não alterar `api/prisma/schema.prisma`; esta fase muda somente grants, policies e RLS.
- Não aplicar DDL remoto com `execute_sql` ou `supabase apply_migration`; produção deve usar `prisma migrate deploy` para preservar `_prisma_migrations`.
- Não criar policies com `auth.uid()`, `auth.jwt()` ou `SECURITY DEFINER`.
- Não conceder privilégios a `anon`, `authenticated` ou `service_role`.
- Não remover nem enfraquecer `JwtAuthGuard`, `RolesGuard`, `ClientAccessService` ou filtros por `professionalId`.
- Não imprimir URLs completas, senhas, chaves, JWTs ou conteúdo clínico em testes e logs.
- Usar somente o banco isolado `ecossistema_resiliencia_test` na porta `5434` durante os testes locais.
- Usar `npm.cmd` e `npx.cmd` no PowerShell.
- O projeto Supabase de produção é `zmjcxysenzrqycktckip`; confirmar o identificador novamente antes de qualquer escrita.
- O schema Prisma declara `ConsultationNote`/`consultation_notes`, mas nenhuma migration versionada ou tabela remota correspondente existe. Não corrigir esse drift nesta fase; a futura migration que criar a tabela deverá habilitar seu próprio RLS.
- A Data API permanecerá reversível no painel, mas grants só poderão ser restaurados por uma nova decisão e migration revisada.

## File Structure

- `api/src/infra/database/rls-hardening.spec.ts`: contrato estático que impede omissão de tabela, policy ou revogação na migration.
- `api/test/database-security.e2e-spec.ts`: verifica o estado real do catálogo PostgreSQL após `prisma migrate deploy`.
- `api/prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql`: única fonte versionada do DDL de hardening.
- `docs/runbooks/supabase-data-api-rls-hardening.md`: procedimento de preflight, deploy, verificação e resposta a falhas.
- `docs/SECURITY.md`: estado de segurança efetivamente implantado.
- `docs/TASKS.md`: conclusão do item 4.7 somente depois da verificação remota.
- `docs/agents/CODEX_STATUS.md`: progresso e evidências finais da tarefa.
- `docs/superpowers/specs/2026-09-15-supabase-data-api-rls-hardening-design.md`: status da especificação.

## Required References

- Supabase, “Securing your API”: `https://supabase.com/docs/guides/api/securing-your-api`
- Supabase, “Row Level Security”: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase changelog, “Tables not exposed to Data and GraphQL API automatically”: `https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically`
- Project architecture: `docs/ARCHITECTURE.md`
- Accepted isolation decision: `docs/DECISIONS.md`, ADR-002
- Current security contract: `docs/SECURITY.md`

---

### Task 1: Implementar e provar a migration de hardening

**Files:**
- Create: `api/src/infra/database/rls-hardening.spec.ts`
- Create: `api/test/database-security.e2e-spec.ts`
- Create: `api/prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql`

**Interfaces:**
- Consumes: PostgreSQL catalogs `pg_class`, `pg_namespace`, `pg_policies`, `pg_roles` and `has_table_privilege()`.
- Produces: RLS ativo e policy `deny_data_api_access` em 33 tabelas; grants atuais e defaults revogados para roles da Data API.

- [ ] **Step 1: Escrever o teste unitário de contrato da migration**

Criar `api/src/infra/database/rls-hardening.spec.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql',
);

const APPLICATION_TABLES = [
  'User',
  'DailyTracking',
  'clients',
  'client_audit_events',
  'professional_patient_links',
  'diet_plans',
  'meals',
  'meal_items',
  'foods',
  'food_preferences',
  'meal_logs',
  'physical_assessments',
  'physio_assessments',
  'workouts',
  'workout_splits',
  'workout_exercises',
  'workout_logs',
  'workout_log_sets',
  'rehab_plans',
  'rehab_sessions',
  'rehab_exercises',
  'anamneses',
  'supplement_plans',
  'supplement_items',
  'lab_exams',
  'lab_markers',
  'patient_alerts',
  'patient_consents',
  'health_check_ins',
  'agenda_tasks',
  'agenda_task_occurrences',
  'appointments',
  'appointment_events',
] as const;

describe('Supabase Data API RLS hardening migration', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  it('enumerates every physical application table exactly once for RLS', () => {
    const tables = [...sql.matchAll(
      /ALTER TABLE "public"\."([^"]+)" ENABLE ROW LEVEL SECURITY;/g,
    )].map((match) => match[1]);

    expect(tables).toEqual(APPLICATION_TABLES);
    expect(tables).not.toContain('_prisma_migrations');
    expect(tables).not.toContain('consultation_notes');
  });

  it('creates one restrictive deny policy for every managed table', () => {
    const policyTables = [...sql.matchAll(
      /CREATE POLICY "deny_data_api_access" ON "public"\."([^"]+)" AS RESTRICTIVE FOR ALL TO PUBLIC USING \(false\) WITH CHECK \(false\);/g,
    )].map((match) => match[1]);

    expect(policyTables).toEqual(APPLICATION_TABLES);
  });

  it('revokes current and default Data API privileges without auth helpers', () => {
    expect(sql).toContain(
      "ARRAY['anon', 'authenticated', 'service_role']",
    );
    expect(sql).toContain(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public',
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES',
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
    );
    expect(sql).not.toMatch(/\bGRANT\b/i);
    expect(sql).not.toMatch(/auth\.(uid|jwt)\s*\(/i);
    expect(sql).not.toMatch(/SECURITY\s+DEFINER/i);
  });
});
```

- [ ] **Step 2: Escrever o E2E do catálogo PostgreSQL**

Criar `api/test/database-security.e2e-spec.ts`:

```typescript
import { Pool } from 'pg';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';

const APPLICATION_TABLES = [
  'User',
  'DailyTracking',
  'clients',
  'client_audit_events',
  'professional_patient_links',
  'diet_plans',
  'meals',
  'meal_items',
  'foods',
  'food_preferences',
  'meal_logs',
  'physical_assessments',
  'physio_assessments',
  'workouts',
  'workout_splits',
  'workout_exercises',
  'workout_logs',
  'workout_log_sets',
  'rehab_plans',
  'rehab_sessions',
  'rehab_exercises',
  'anamneses',
  'supplement_plans',
  'supplement_items',
  'lab_exams',
  'lab_markers',
  'patient_alerts',
  'patient_consents',
  'health_check_ins',
  'agenda_tasks',
  'agenda_task_occurrences',
  'appointments',
  'appointment_events',
] as const;

describe('Database defensive RLS hardening (e2e)', () => {
  let pool: Pool;

  beforeAll(() => {
    expect(SAFE_TEST_DATABASE_URL).toMatch(/_test$/);
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);
    pool = new Pool({ connectionString: SAFE_TEST_DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('enables RLS on every physical application table', async () => {
    const result = await pool.query<{ table_name: string; rls_enabled: boolean }>(
      `select c.relname as table_name, c.relrowsecurity as rls_enabled
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relkind = 'r'
         and c.relname = any($1::text[])
       order by array_position($1::text[], c.relname)`,
      [APPLICATION_TABLES],
    );

    expect(result.rows.map((row) => row.table_name)).toEqual(
      APPLICATION_TABLES,
    );
    expect(result.rows.every((row) => row.rls_enabled)).toBe(true);
  });

  it('installs the restrictive deny policy on every managed table', async () => {
    const result = await pool.query<{
      tablename: string;
      permissive: string;
      roles: string[];
      cmd: string;
      qual: string;
      with_check: string;
    }>(
      `select tablename, permissive, roles, cmd, qual, with_check
       from pg_policies
       where schemaname = 'public'
         and policyname = 'deny_data_api_access'
         and tablename = any($1::text[])
       order by array_position($1::text[], tablename)`,
      [APPLICATION_TABLES],
    );

    expect(result.rows.map((row) => row.tablename)).toEqual(
      APPLICATION_TABLES,
    );
    for (const policy of result.rows) {
      expect(policy.permissive).toBe('RESTRICTIVE');
      expect(policy.roles).toEqual(['public']);
      expect(policy.cmd).toBe('ALL');
      expect(policy.qual).toBe('false');
      expect(policy.with_check).toBe('false');
    }
  });

  it('leaves existing Supabase Data API roles without table privileges', async () => {
    const result = await pool.query<{ role_name: string; can_access: boolean }>(
      `select r.rolname as role_name,
              bool_or(
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'SELECT')
                or has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'INSERT')
                or has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'UPDATE')
                or has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'DELETE')
              ) as can_access
       from pg_roles r
       cross join unnest($1::text[]) as table_name
       where r.rolname = any($2::text[])
       group by r.rolname
       order by r.rolname`,
      [APPLICATION_TABLES, ['anon', 'authenticated', 'service_role']],
    );

    expect(result.rows.every((row) => row.can_access === false)).toBe(true);
  });
});
```

- [ ] **Step 3: Executar os testes antes da migration e confirmar a falha correta**

No diretório raiz:

```powershell
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d
```

No diretório `api`:

```powershell
$testDatabaseUrl = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$env:DATABASE_URL = $testDatabaseUrl
$env:DIRECT_URL = $testDatabaseUrl
npx.cmd prisma migrate deploy
npm.cmd test -- rls-hardening.spec.ts --runInBand
npm.cmd run test:e2e -- database-security.e2e-spec.ts --runInBand
```

Expected:

- unitário falha porque `migration.sql` ainda não existe;
- E2E falha porque apenas `diet_plans` e `meal_items` têm RLS e nenhuma tabela possui `deny_data_api_access`.

- [ ] **Step 4: Criar a migration com RLS enumerado e revogação condicional de roles**

Criar `api/prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql` com o conteúdo abaixo. Não substituir a lista por introspecção dinâmica.

```sql
-- Defensive RLS for browser-facing database roles.
-- NestJS/Prisma currently connects as postgres with BYPASSRLS; application-level
-- professional ownership remains mandatory.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."User";
CREATE POLICY "deny_data_api_access" ON "public"."User" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."DailyTracking" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."DailyTracking";
CREATE POLICY "deny_data_api_access" ON "public"."DailyTracking" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."clients";
CREATE POLICY "deny_data_api_access" ON "public"."clients" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."client_audit_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."client_audit_events";
CREATE POLICY "deny_data_api_access" ON "public"."client_audit_events" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."professional_patient_links" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."professional_patient_links";
CREATE POLICY "deny_data_api_access" ON "public"."professional_patient_links" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."diet_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."diet_plans";
CREATE POLICY "deny_data_api_access" ON "public"."diet_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."meals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."meals";
CREATE POLICY "deny_data_api_access" ON "public"."meals" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."meal_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."meal_items";
CREATE POLICY "deny_data_api_access" ON "public"."meal_items" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."foods" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."foods";
CREATE POLICY "deny_data_api_access" ON "public"."foods" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."food_preferences" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."food_preferences";
CREATE POLICY "deny_data_api_access" ON "public"."food_preferences" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."meal_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."meal_logs";
CREATE POLICY "deny_data_api_access" ON "public"."meal_logs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."physical_assessments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."physical_assessments";
CREATE POLICY "deny_data_api_access" ON "public"."physical_assessments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."physio_assessments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."physio_assessments";
CREATE POLICY "deny_data_api_access" ON "public"."physio_assessments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workouts";
CREATE POLICY "deny_data_api_access" ON "public"."workouts" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_splits" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_splits";
CREATE POLICY "deny_data_api_access" ON "public"."workout_splits" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_exercises";
CREATE POLICY "deny_data_api_access" ON "public"."workout_exercises" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_logs";
CREATE POLICY "deny_data_api_access" ON "public"."workout_logs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_log_sets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_log_sets";
CREATE POLICY "deny_data_api_access" ON "public"."workout_log_sets" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."rehab_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."rehab_plans";
CREATE POLICY "deny_data_api_access" ON "public"."rehab_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."rehab_sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."rehab_sessions";
CREATE POLICY "deny_data_api_access" ON "public"."rehab_sessions" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."rehab_exercises" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."rehab_exercises";
CREATE POLICY "deny_data_api_access" ON "public"."rehab_exercises" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."anamneses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."anamneses";
CREATE POLICY "deny_data_api_access" ON "public"."anamneses" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."supplement_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."supplement_plans";
CREATE POLICY "deny_data_api_access" ON "public"."supplement_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."supplement_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."supplement_items";
CREATE POLICY "deny_data_api_access" ON "public"."supplement_items" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."lab_exams" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."lab_exams";
CREATE POLICY "deny_data_api_access" ON "public"."lab_exams" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."lab_markers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."lab_markers";
CREATE POLICY "deny_data_api_access" ON "public"."lab_markers" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."patient_alerts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."patient_alerts";
CREATE POLICY "deny_data_api_access" ON "public"."patient_alerts" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."patient_consents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."patient_consents";
CREATE POLICY "deny_data_api_access" ON "public"."patient_consents" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."health_check_ins" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."health_check_ins";
CREATE POLICY "deny_data_api_access" ON "public"."health_check_ins" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."agenda_tasks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."agenda_tasks";
CREATE POLICY "deny_data_api_access" ON "public"."agenda_tasks" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."agenda_task_occurrences" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."agenda_task_occurrences";
CREATE POLICY "deny_data_api_access" ON "public"."agenda_task_occurrences" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."appointments";
CREATE POLICY "deny_data_api_access" ON "public"."appointments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."appointment_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."appointment_events";
CREATE POLICY "deny_data_api_access" ON "public"."appointment_events" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

DO $hardening$
DECLARE
  data_api_role text;
BEGIN
  FOREACH data_api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = data_api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
        data_api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
        data_api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
        data_api_role
      );
    END IF;
  END LOOP;

  EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC';
END
$hardening$;
```

- [ ] **Step 5: Aplicar somente no banco local isolado**

No diretório `api`, mantendo as variáveis do Step 3:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
```

Expected: nove migrations encontradas, banco de teste atualizado e nenhuma conexão com host Supabase exibida.

- [ ] **Step 6: Executar os testes dirigidos**

```powershell
npm.cmd test -- rls-hardening.spec.ts --runInBand
npm.cmd run test:e2e -- database-security.e2e-spec.ts --runInBand
```

Expected: ambos PASS; 33 tabelas com RLS e 33 policies restritivas.

- [ ] **Step 7: Revisar e commitar a camada de banco**

```powershell
git diff --check
git diff -- api/src/infra/database/rls-hardening.spec.ts api/test/database-security.e2e-spec.ts api/prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql
git add -- api/src/infra/database/rls-hardening.spec.ts api/test/database-security.e2e-spec.ts api/prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql
git diff --cached --check
git commit -m "feat: harden Supabase Data API access"
```

---

### Task 2: Criar o runbook operacional

**Files:**
- Create: `docs/runbooks/supabase-data-api-rls-hardening.md`

**Interfaces:**
- Consumes: migration e testes da Task 1.
- Produces: procedimento reproduzível de preflight, deploy, verificação e correção forward-only.

- [ ] **Step 1: Escrever o runbook sem segredos**

Criar `docs/runbooks/supabase-data-api-rls-hardening.md`:

```markdown
# Runbook: Supabase Data API e RLS defensivo

## Escopo

Este procedimento protege o projeto `zmjcxysenzrqycktckip` contra acesso direto
pela Data API. Ele não substitui o ownership por `professionalId` na API NestJS.

## Preflight obrigatório

1. Confirmar branch e worktree limpo com `git status --short --branch`.
2. Confirmar que o projeto remoto é `zmjcxysenzrqycktckip`.
3. Executar `npx.cmd prisma migrate status` em `api` sem imprimir variáveis.
4. Confirmar que a conexão resolve para `postgres` com `BYPASSRLS`.
5. Confirmar zero privilégios efetivos para `anon`, `authenticated` e
   `service_role` sobre tabelas públicas.
6. Rodar o gate local completo antes de qualquer escrita remota.

## Implantação

1. Obter confirmação humana final para produção.
2. Em `api`, executar `npx.cmd prisma migrate deploy` usando as variáveis já
   configuradas no ambiente seguro.
3. No Dashboard Supabase, abrir **Integrations > Data API > Settings** e desligar
   **Enable Data API**.
4. Não alterar Auth, Storage, pooling ou connection strings.

## Verificação

1. Confirmar nove migrations aplicadas em `_prisma_migrations`.
2. Consultar `pg_class` e confirmar RLS nas 33 tabelas enumeradas pela migration.
3. Consultar `pg_policies` e confirmar 33 policies
   `deny_data_api_access`, todas `RESTRICTIVE`, `ALL`, `PUBLIC`, `false`.
4. Confirmar zero tabelas alcançáveis pelas três roles da Data API.
5. Confirmar que REST e GraphQL não atendem consultas com chave publicável.
6. Validar sessão, clientes, agenda, dietas e avaliações pela API NestJS.
7. Rodar o Supabase Security Advisor e registrar somente nomes e contagens.

## Falha

- Interromper a implantação no primeiro gate inconsistente.
- Nunca conceder privilégios amplos para recuperar funcionamento.
- A Data API pode ser reativada se uma dependência legítima for descoberta.
- Migration aplicada não é editada nem removida; correções usam nova migration.
- Se a API NestJS falhar, comparar o papel efetivo do banco com o preflight e
  criar uma correção forward-only antes de retomar.

## Evidência permitida

Registrar somente commit, migration, número de tabelas, número de policies,
resultado dos testes e advisors. Nunca registrar dados clínicos, chaves ou URLs
com credenciais.
```

- [ ] **Step 2: Validar o documento**

```powershell
rg -n "TBD|TODO|service_role|BYPASSRLS|professionalId|Enable Data API" docs/runbooks/supabase-data-api-rls-hardening.md
git diff --check
```

Expected: nenhum placeholder; limites de RLS e `service_role` aparecem explicitamente.

- [ ] **Step 3: Commitar o runbook**

```powershell
git add -- docs/runbooks/supabase-data-api-rls-hardening.md
git diff --cached --check
git commit -m "docs: add Supabase security hardening runbook"
```

---

### Task 3: Executar o gate local completo

**Files:**
- Verify only: `api/`
- Verify only: `docker-compose.test.yml`

**Interfaces:**
- Consumes: migration e testes da Task 1.
- Produces: evidência de que o hardening não quebrou o Prisma ou os limites profissionais.

- [ ] **Step 1: Recriar o banco isolado a partir de zero**

No diretório raiz:

```powershell
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml ps
```

Expected: somente `db-test` saudável na porta `5434`.

- [ ] **Step 2: Aplicar todas as migrations em banco limpo**

No diretório `api`:

```powershell
$testDatabaseUrl = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$env:DATABASE_URL = $testDatabaseUrl
$env:DIRECT_URL = $testDatabaseUrl
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
```

Expected: schema válido, nove migrations aplicadas e datasource em `localhost:5434`.

- [ ] **Step 3: Rodar geração, testes e build**

```powershell
npx.cmd prisma generate
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run build
```

Expected: todos os comandos terminam com exit code `0`.

- [ ] **Step 4: Confirmar worktree e encerrar o banco de teste**

No diretório raiz:

```powershell
git status --short --branch
docker compose -f docker-compose.test.yml down -v
```

Expected: somente mudanças planejadas, se houver; banco descartável removido.

---

### Task 4: Implantar e verificar no Supabase de produção

**Files:**
- Execute: `api/prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql`
- Follow: `docs/runbooks/supabase-data-api-rls-hardening.md`

**Interfaces:**
- Consumes: gate local verde da Task 3 e confirmação humana final.
- Produces: production database hardened, Data API disabled, NestJS smoke tests green.

- [ ] **Step 1: Revalidar o snapshot remoto sem escrita**

Usar o Supabase MCP no projeto `zmjcxysenzrqycktckip` para confirmar:

- projeto `ACTIVE_HEALTHY`;
- 34 tabelas físicas públicas no estado anterior, sendo 33 de aplicação e
  `_prisma_migrations`;
- `consultation_notes` ainda ausente;
- zero grants efetivos para `anon`, `authenticated` e `service_role`;
- papel `postgres` com `BYPASSRLS`;
- somente `diet_plans` e `meal_items` com RLS e nenhuma policy.

Expected: qualquer diferença interrompe o deploy e exige atualização do plano.

- [ ] **Step 2: Obter confirmação humana imediatamente antes do deploy**

Apresentar o commit da migration, os quatro resultados da Task 3 e o snapshot da Step 1. Perguntar uma única vez se a migration pode ser aplicada no projeto `zmjcxysenzrqycktckip`.

Expected: não executar escrita sem resposta afirmativa.

- [ ] **Step 3: Aplicar a migration pelo histórico Prisma**

No diretório `api`, usando as variáveis remotas já configuradas e sem imprimi-las:

```powershell
npx.cmd prisma migrate status
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
```

Expected: `20260915133000_harden_supabase_data_api_rls` aplicada uma vez e banco atualizado.

- [ ] **Step 4: Desabilitar a Data API**

No Dashboard do projeto `zmjcxysenzrqycktckip`:

1. abrir **Integrations**;
2. abrir **Data API**;
3. abrir **Settings**;
4. desligar **Enable Data API**;
5. salvar e confirmar que REST e GraphQL aparecem desativados.

Expected: conexão PostgreSQL, Auth e Storage permanecem ativos.

- [ ] **Step 5: Verificar catálogo, grants e advisors**

Usar consultas somente leitura via Supabase MCP:

```sql
select count(*) filter (where c.relrowsecurity) as rls_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname <> '_prisma_migrations';

select count(*) as deny_policies
from pg_policies
where schemaname = 'public'
  and policyname = 'deny_data_api_access'
  and permissive = 'RESTRICTIVE'
  and cmd = 'ALL'
  and qual = 'false'
  and with_check = 'false';
```

Expected: `rls_tables = 33`, `deny_policies = 33`, zero roles da Data API com privilégios efetivos e nenhum finding de tabela de aplicação sem RLS/policy.

- [ ] **Step 6: Executar smoke tests somente pela aplicação**

Com uma sessão profissional existente, validar sem registrar payloads:

- `GET /auth/me` retorna `200`;
- diretório de clientes carrega;
- agenda carrega e permite uma leitura;
- planos alimentares e alimentos carregam;
- avaliações carregam;
- uma operação segura e reversível de escrita via NestJS mantém sucesso.

Expected: nenhum fluxo usa `/rest/v1` ou `/graphql/v1`; a API NestJS continua operando.

---

### Task 5: Registrar conclusão e atualizar o grafo

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `docs/TASKS.md`
- Modify: `docs/agents/CODEX_STATUS.md`
- Modify: `docs/superpowers/specs/2026-09-15-supabase-data-api-rls-hardening-design.md`
- Update generated: `graphify-out/`

**Interfaces:**
- Consumes: evidências locais e remotas das Tasks 3 e 4.
- Produces: documentação honesta do estado implantado e grafo sincronizado.

- [ ] **Step 1: Documentar a nova camada no modelo de segurança**

Adicionar após `## 3. Isolamento de Dados` em `docs/SECURITY.md`:

```markdown
### Defesa no banco Supabase

- A Data API REST/GraphQL está desabilitada; o frontend usa somente a API NestJS.
- `anon`, `authenticated` e `service_role` não possuem grants sobre tabelas públicas.
- As 33 tabelas físicas de aplicação usam RLS com policy restritiva
  `deny_data_api_access`.
- O Prisma conecta como `postgres` com `BYPASSRLS`; portanto, o RLS atual protege a
  superfície Data API, mas não aplica isolamento entre profissionais à API NestJS.
- Ownership por `professionalId`, guards e testes negativos continuam obrigatórios.
- Qualquer exposição futura exige migration com grant mínimo e policy de ownership
  aprovada. Policies com `auth.uid()` são incompatíveis com o JWT próprio atual.
```

- [ ] **Step 2: Atualizar o rastreamento somente se produção estiver verde**

Em `docs/TASKS.md`, alterar o item 4.7 de `🔄` para `✅`.

Em `docs/agents/CODEX_STATUS.md`:

- restaurar `Current Task` para `Nenhuma tarefa em andamento`;
- adicionar em `Completed` uma linha datada de 2026-09-15 com o hardening;
- registrar em `Notes` apenas contagens, testes e estado dos advisors.

Na especificação, alterar o status para:

```markdown
- **Status:** implementado e verificado em produção
```

Se qualquer verificação remota estiver incompleta, manter 4.7 em andamento e registrar o impedimento sem declarar conclusão.

- [ ] **Step 3: Atualizar Graphify depois das mudanças relevantes**

No diretório raiz:

```powershell
graphify update .
graphify reflect
```

Expected: `graphify-out/GRAPH_REPORT.md`, `graph.json` e reflections refletem a migration e a documentação nova; nenhum segredo entra no corpus.

- [ ] **Step 4: Executar a verificação final de documentação e Git**

```powershell
rg -n "TBD|TODO" docs/SECURITY.md docs/runbooks/supabase-data-api-rls-hardening.md docs/superpowers/specs/2026-09-15-supabase-data-api-rls-hardening-design.md
git diff --check
git status --short --branch
```

Expected: nenhum placeholder ou erro de whitespace; apenas os arquivos esperados estão modificados.

- [ ] **Step 5: Commitar as evidências finais**

```powershell
git add -- docs/SECURITY.md docs/TASKS.md docs/agents/CODEX_STATUS.md docs/superpowers/specs/2026-09-15-supabase-data-api-rls-hardening-design.md graphify-out
git diff --cached --check
git commit -m "docs: record Supabase hardening verification"
```

- [ ] **Step 6: Entregar o resultado com limites explícitos**

Relatar:

- commit da migration;
- migration aplicada;
- Data API desabilitada;
- `33` tabelas com RLS;
- `33` policies restritivas;
- `0` tabelas alcançáveis pelas roles da Data API;
- testes e build executados;
- findings restantes dos advisors;
- aviso de que isolamento tenant-aware no PostgreSQL permanece uma fase posterior.

Somente depois dessa entrega iniciar o plano separado do Banco de Receitas.
