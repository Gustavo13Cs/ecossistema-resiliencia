# Agenda Diária Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o primeiro recorte funcional da Agenda Diária Integrada: tarefas manuais únicas/recorrentes, execução pelo paciente, check-in de saúde, consentimento controlado e acompanhamento básico pelo profissional.

**Architecture:** O backend terá módulos NestJS separados para acesso clínico, agenda e check-ins. O Prisma persistirá definição e ocorrências separadamente; recorrências serão materializadas de forma idempotente em uma janela de 30 dias. O frontend terá rotas novas para paciente e profissional, consumindo contratos tipados via Axios sem alterar `DailyTracking`.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 16, Jest 30, `rrule` 2.8.1, Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Axios e Cypress 15.

## Global Constraints

- Este plano implementa somente o núcleo da agenda. Agendamentos híbridos e notificações/e-mail terão planos separados.
- Preservar todas as alterações locais existentes; nunca sobrescrever arquivos sujos sem incorporar o conteúdo atual.
- Não executar `prisma migrate dev`, `migrate deploy`, `db push`, `migrate resolve` ou limpeza contra Supabase/remoto.
- Migrations e testes de integração usam exclusivamente PostgreSQL local em `localhost:5434`, banco `ecossistema_resiliencia_test`.
- Datas persistidas em UTC; `timeZone` deve ser um identificador IANA; runtime da API e testes usam `TZ=UTC`.
- Autorizações clínicas exigem role profissional, vínculo ativo, autoria e consentimento quando aplicável.
- `ADMIN` não recebe acesso clínico irrestrito e não cria tarefas para pacientes.
- `DailyTracking`, `MealLog` e `WorkoutLog` permanecem fontes independentes e não recebem duplo registro.
- Usar `npm.cmd` e `npx.cmd` no PowerShell; gerar Prisma Client antes de julgar erros de tipos.
- Não aceitar build do Next.js com `ignoreBuildErrors`; executar `npx.cmd tsc --noEmit` explicitamente.
- Nenhum teste pode conter credencial real. A senha atualmente exposta nos testes Cypress deve ser rotacionada pelo usuário fora do código.
- A referência técnica da recorrência é a API `RRule`, com `TZID` IANA e datas representadas em UTC: https://github.com/jkbrzt/rrule#timezone-support

---

## File Map

### Banco e infraestrutura

- Modify: `docker-compose.yml` — PostgreSQL local, healthcheck e variáveis seguras para a API no Docker.
- Modify: `api/.env.example` — documentar `DIRECT_URL`, `TZ` e origens.
- Replace: `api/prisma/migrations/202603*/migration.sql` e `api/prisma/migrations/202604*/migration.sql` — histórico divergente será substituído por baseline reproduzível.
- Create: `api/prisma/migrations/20260813000000_baseline/migration.sql` — baseline completo anterior à agenda.
- Create: `api/prisma/migrations/20260813120000_add_agenda_core/migration.sql` — delta exclusivo da agenda.
- Modify: `api/prisma/schema.prisma` — relações, enums e modelos da agenda/check-in/consentimento.
- Create: `docs/database-baseline.md` — procedimento seguro para reconciliar ambientes já existentes, sem executá-lo automaticamente.

### Backend

- Create: `api/src/common/types/auth-user.ts` — contrato do usuário autenticado.
- Create: `api/src/common/patient-access/patient-access.module.ts` — exporta o serviço de acesso clínico.
- Create: `api/src/common/patient-access/patient-access.service.ts` — vínculo ativo, role, autoria e identidade.
- Create: `api/src/common/patient-access/patient-access.service.spec.ts` — testes negativos e positivos de acesso.
- Create: `api/src/modules/consents/*` — concessão e revogação de consentimento por categoria.
- Create: `api/src/modules/agenda/*` — DTOs, recorrência, serviços, controller, scheduler e testes.
- Create: `api/src/modules/health-check-ins/*` — DTOs, serviço, controller e testes.
- Modify: `api/src/app.module.ts` — registrar módulos novos.
- Modify: `api/package.json` e `api/package-lock.json` — adicionar `rrule@2.8.1`, `cross-env@7.0.3` e scripts seguros com `TZ=UTC`.
- Create: `api/test/agenda.e2e-spec.ts` — jornada HTTP sobre banco local dedicado.

### Frontend

- Create: `web/types/agenda.ts` — contratos retornados pela API.
- Create: `web/hooks/features/useAgenda.ts` — consulta e mutações da agenda.
- Create: `web/hooks/features/useHealthCheckIn.ts` — check-in e consentimento.
- Create: `web/components/features/agenda/*` — cards, progresso e diálogos focados.
- Create: `web/app/paciente/agenda/page.tsx` — rotina diária do paciente.
- Create: `web/app/membros/[id]/agenda/page.tsx` — planejamento e acompanhamento profissional.
- Modify: `web/app/paciente/layout.tsx` — adicionar Agenda à navegação.
- Modify: `web/app/membros/page.tsx` — adicionar acesso à agenda sem tocar na ficha atualmente modificada.
- Modify: `web/next.config.mjs` — remover supressão de erros TypeScript.
- Modify: `web/cypress/e2e/login.cy.ts` e `web/cypress/e2e/patient-journey.cy.ts` — remover credenciais reais.
- Create: `web/cypress/e2e/agenda-patient.cy.ts` e `web/cypress/e2e/agenda-professional.cy.ts` — jornadas com API interceptada.

---

### Task 1: Restore a Safe, Honest Verification Baseline

**Files:**
- Modify: `web/app/membros/novo/page.tsx:60,102,192`
- Modify: `web/components/sport-selector.tsx:61-63`
- Modify: `web/app/paciente/dieta/page.tsx:127`
- Modify: `web/next.config.mjs:1-10`
- Modify: `web/cypress/e2e/login.cy.ts`
- Modify: `web/cypress/e2e/patient-journey.cy.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `User.role` de `web/contexts/auth-context.tsx`.
- Produces: baseline `npx.cmd tsc --noEmit` verde e testes Cypress sem segredo real.

- [ ] **Step 1: Record the current failures**

Run:

```powershell
cd web
npx.cmd tsc --noEmit
```

Expected: FAIL com seis erros: cinco usos de `businessContext` inexistente e um `string | null` passado como `string | undefined`.

- [ ] **Step 2: Replace the obsolete business context with the authenticated role**

Em `web/app/membros/novo/page.tsx`, declarar uma vez após `useAuth()`:

```tsx
const isNutritionist = user?.role === "NUTRITIONIST"
```

Substituir as três comparações `user?.businessContext === 'NUTRITIONIST'` por `isNutritionist`.

Em `web/components/sport-selector.tsx`, substituir o acesso inexistente por:

```tsx
const currentContextKey = user?.role === "NUTRITIONIST"
  ? "NUTRITIONIST"
  : "PERSONAL_TRAINER"
const currentContext = contextConfig[currentContextKey]
```

- [ ] **Step 3: Normalize the nullable meal time**

Em `web/app/paciente/dieta/page.tsx`, usar:

```tsx
onClick={() => setActiveMeal({
  id: meal.id,
  name: meal.name,
  time: meal.time ?? undefined,
})}
```

- [ ] **Step 4: Make the Next.js build enforce TypeScript**

Substituir `web/next.config.mjs` por:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

- [ ] **Step 5: Replace credential-backed Cypress login with network stubs**

O login test deve usar somente dados fictícios:

```ts
describe("Fluxo de autenticação", () => {
  it("redireciona paciente autenticado", () => {
    cy.intercept("POST", "**/auth/login", { statusCode: 201, body: {} })
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "patient-e2e", role: "PATIENT", name: "Paciente Teste" },
    })

    cy.visit("http://localhost:3001/auth/login")
    cy.get('input[type="email"]').type("patient@example.test")
    cy.get('input[type="password"]').type("not-a-real-password")
    cy.get('button[type="submit"]').click()
    cy.url().should("include", "/paciente")
  })
})
```

Em `patient-journey.cy.ts`, substituir o login real por um `beforeEach` determinístico:

```ts
beforeEach(() => {
  cy.intercept("GET", "**/auth/me", {
    body: { sub: "patient-e2e", role: "PATIENT", name: "Paciente Teste" },
  })
  cy.intercept("GET", "**/users/patient-e2e", {
    body: { id: "patient-e2e", name: "Paciente Teste", initialWeight: 80 },
  })
  cy.intercept("PATCH", "**/users/patient-e2e", { statusCode: 200, body: {} })
  cy.intercept("GET", "**/diet-plans/user/patient-e2e/active", { body: null })
  cy.intercept("GET", "**/metrics/today/patient-e2e", { body: [] })
  cy.intercept("GET", "**/metrics/consistency/patient-e2e", {
    body: { percentage: 0, activeDays: 0, totalLogs: 0, history: [] },
  })
  cy.intercept("GET", "**/supplements/user/patient-e2e/active", { body: null })
  cy.visit("http://localhost:3001/paciente")
})
```

Os testes existentes passam a validar apenas comportamentos cobertos pelos stubs. Nenhum e-mail ou senha real permanece no arquivo.

- [ ] **Step 6: Verify the baseline**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
rg -n "889447|gustavocunha0401" cypress
```

Expected: type-check PASS, build PASS, `rg` sem resultados.

Add `.superpowers/` to `.gitignore` so visual-companion artifacts never enter feature commits.

- [ ] **Step 7: Commit**

```powershell
git add -- .gitignore web/app/membros/novo/page.tsx web/components/sport-selector.tsx web/app/paciente/dieta/page.tsx web/next.config.mjs web/cypress/e2e/login.cy.ts web/cypress/e2e/patient-journey.cy.ts
git commit -m "fix: restore safe frontend verification baseline"
```

---

### Task 2: Rebuild Migrations on an Isolated Local Database

**Files:**
- Modify: `docker-compose.yml`
- Modify: `api/.env.example`
- Delete: the nine legacy migration directories listed in the File Map
- Create: `api/prisma/migrations/20260813000000_baseline/migration.sql`
- Create: `docs/database-baseline.md`

**Interfaces:**
- Consumes: current `api/prisma/schema.prisma`, validated by Prisma.
- Produces: a migration history that creates the current pre-agenda schema from an empty PostgreSQL 16 database.

- [ ] **Step 1: Record the migration mismatch without writing to a database**

Run:

```powershell
cd api
npx.cmd prisma migrate status
```

Expected on the current configured environment: nine unapplied migrations. Inspect `20260323174613_init_users_table/migration.sql` and assert it defines `HR_MANAGER/EMPLOYEE`, proving it cannot represent the current `Role` enum.

- [ ] **Step 2: Add an isolated PostgreSQL service**

Add to `docker-compose.yml`:

```yaml
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ecossistema_resiliencia
    ports:
      - "5434:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ecossistema_resiliencia"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - ecossistema_resiliencia_pgdata:/var/lib/postgresql/data
```

Override the API container environment:

```yaml
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/ecossistema_resiliencia
      DIRECT_URL: postgresql://postgres:postgres@db:5432/ecossistema_resiliencia
      ALLOWED_ORIGINS: http://localhost:3001
      TZ: UTC
    depends_on:
      db:
        condition: service_healthy
    command: ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
```

Add at the document root:

```yaml
volumes:
  ecossistema_resiliencia_pgdata:
```

- [ ] **Step 3: Document environment variables**

`api/.env.example` must contain only examples:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia
DIRECT_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia
JWT_SECRET=replace-with-a-random-secret
ALLOWED_ORIGINS=http://localhost:3001
TZ=UTC
```

- [ ] **Step 4: Replace the divergent migration chain with a generated baseline**

Verify all delete targets resolve under `api/prisma/migrations`, then remove only the nine legacy directories. Preserve `migration_lock.toml`.

```powershell
git rm -r -- prisma/migrations/20260323174613_init_users_table prisma/migrations/20260323192409_init_workout_logs prisma/migrations/20260330193540_enrich_user_profile prisma/migrations/20260401173134_add_business_fields prisma/migrations/20260401174856_add_manager_relation prisma/migrations/20260408164713_add_notes_and_weight prisma/migrations/20260409133755_add_anamnesis_fields prisma/migrations/20260409135253_add_advanced_anamnesis prisma/migrations/20260413181000_init_nutrition_module
```

Create the baseline directory and generate SQL:

```powershell
New-Item -ItemType Directory -Force prisma/migrations/20260813000000_baseline
npx.cmd prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/20260813000000_baseline/migration.sql
```

- [ ] **Step 5: Verify the baseline on a disposable test database**

```powershell
docker compose up -d db
docker compose exec -T db dropdb --if-exists -U postgres ecossistema_resiliencia_test
docker compose exec -T db createdb -U postgres ecossistema_resiliencia_test
$env:DIRECT_URL="postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test"
$env:DATABASE_URL=$env:DIRECT_URL
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
```

Expected: deploy PASS e `Database schema is up to date!`. The only dropped database is explicitly named `ecossistema_resiliencia_test`.

- [ ] **Step 6: Write the existing-environment runbook**

`docs/database-baseline.md` must state:

```markdown
# Database migration baseline

The repository migration chain was rebuilt because the previous migrations did not describe the current schema.

For a new database, run `npx prisma migrate deploy` normally.

For an existing database, do not run `migrate deploy` or `migrate resolve` until an operator has:
1. backed up the database;
2. compared it with `prisma/schema.prisma` using `prisma migrate diff`;
3. reviewed the diff as empty;
4. explicitly approved marking `20260813000000_baseline` as applied.

The remote reconciliation is an operator action and is never executed by tests or application startup.
```

- [ ] **Step 7: Commit**

```powershell
git add -- docker-compose.yml api/.env.example api/prisma/migrations docs/database-baseline.md
git commit -m "fix: rebuild reproducible database migration baseline"
```

---

### Task 3: Add the Agenda Core Schema

**Files:**
- Modify: `api/prisma/schema.prisma:10-83,490-502`
- Create: `api/prisma/migrations/20260813120000_add_agenda_core/migration.sql`
- Modify: `api/package.json`
- Modify: `api/package-lock.json`

**Interfaces:**
- Consumes: baseline migration from Task 2.
- Produces: Prisma delegates `agendaTask`, `agendaTaskOccurrence`, `patientConsent`, and `healthCheckIn`.

- [ ] **Step 1: Add a schema contract test by generating against the unchanged schema**

Create `api/src/agenda-schema.spec.ts` importing `Prisma` and referencing `Prisma.AgendaTaskCreateInput`. Run it and expect compilation failure because the type does not exist.

- [ ] **Step 2: Add enums and models**

Add these enums:

```prisma
enum AgendaTaskCategory {
  NUTRITION
  TRAINING
  REHABILITATION
  SUPPLEMENT
  HYDRATION
  CUSTOM
}

enum AgendaTaskPriority {
  LOW
  NORMAL
  HIGH
}

enum AgendaTaskStatus {
  ACTIVE
  PAUSED
  ENDED
}

enum AgendaOccurrenceStatus {
  PENDING
  COMPLETED
  SKIPPED
  OVERDUE
  CANCELLED
}

enum ConsentCategory {
  GENERAL
  NUTRITION
  TRAINING
  REHABILITATION
  HEALTH_CHECK_IN
}
```

Add models with explicit relations:

```prisma
model AgendaTask {
  id             String             @id @default(uuid())
  patientId      String
  patient        User               @relation("PatientAgendaTasks", fields: [patientId], references: [id], onDelete: Cascade)
  professionalId String
  professional   User               @relation("ProfessionalAgendaTasks", fields: [professionalId], references: [id], onDelete: Cascade)
  title          String
  category       AgendaTaskCategory
  instructions   String?            @db.Text
  priority       AgendaTaskPriority @default(NORMAL)
  startsAt       DateTime
  endsAt         DateTime?
  timeZone       String
  recurrenceRule String?
  status         AgendaTaskStatus   @default(ACTIVE)
  occurrences    AgendaTaskOccurrence[]
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  @@index([patientId, status])
  @@index([professionalId, status])
  @@map("agenda_tasks")
}

model AgendaTaskOccurrence {
  id           String                 @id @default(uuid())
  taskId       String
  task         AgendaTask             @relation(fields: [taskId], references: [id], onDelete: Cascade)
  patientId    String
  patient      User                   @relation("PatientAgendaOccurrences", fields: [patientId], references: [id], onDelete: Cascade)
  scheduledFor DateTime
  status       AgendaOccurrenceStatus @default(PENDING)
  completedAt  DateTime?
  skipReason   String?
  patientNote  String?                @db.Text
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt

  @@unique([taskId, scheduledFor])
  @@index([patientId, scheduledFor, status])
  @@map("agenda_task_occurrences")
}

model PatientConsent {
  id             String          @id @default(uuid())
  patientId      String
  patient        User            @relation("PatientConsents", fields: [patientId], references: [id], onDelete: Cascade)
  professionalId String
  professional   User            @relation("ProfessionalConsents", fields: [professionalId], references: [id], onDelete: Cascade)
  dataCategory   ConsentCategory
  granted        Boolean         @default(false)
  grantedAt      DateTime?
  revokedAt      DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([patientId, professionalId, dataCategory])
  @@map("patient_consents")
}

model HealthCheckIn {
  id        String   @id @default(uuid())
  patientId String
  patient   User     @relation("PatientHealthCheckIns", fields: [patientId], references: [id], onDelete: Cascade)
  recordedAt DateTime @default(now())
  waterMl    Int?
  painLevel  Int?
  mood       Int?
  symptoms   String?  @db.Text
  notes      String?  @db.Text
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([patientId, recordedAt])
  @@map("health_check_ins")
}
```

Add these six relation arrays to `User`:

```prisma
patientAgendaTasks      AgendaTask[]           @relation("PatientAgendaTasks")
professionalAgendaTasks AgendaTask[]           @relation("ProfessionalAgendaTasks")
agendaOccurrences       AgendaTaskOccurrence[] @relation("PatientAgendaOccurrences")
patientConsents         PatientConsent[]        @relation("PatientConsents")
professionalConsents    PatientConsent[]        @relation("ProfessionalConsents")
healthCheckIns           HealthCheckIn[]         @relation("PatientHealthCheckIns")
```

- [ ] **Step 3: Install the recurrence dependency**

```powershell
cd api
npm.cmd install rrule@2.8.1 --save
npm.cmd install cross-env@7.0.3 --save-dev
```

Change Jest scripts to run under UTC on Windows and Linux:

```json
"test": "cross-env TZ=UTC jest",
"test:watch": "cross-env TZ=UTC jest --watch",
"test:cov": "cross-env TZ=UTC jest --coverage"
```

Add `TZ=UTC` to Docker/API environments. Do not change machine-wide timezone.

- [ ] **Step 4: Generate and inspect the delta migration**

With `DIRECT_URL` pointing only to the local database whose baseline is applied:

```powershell
npx.cmd prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script --output agenda-core-migration.sql
New-Item -ItemType Directory -Force prisma/migrations/20260813120000_add_agenda_core
Move-Item -LiteralPath agenda-core-migration.sql -Destination prisma/migrations/20260813120000_add_agenda_core/migration.sql
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npx.cmd prisma validate
```

Inspect SQL: it may create only the five enums, four tables, indexes and foreign keys above; it must not drop or recreate existing clinical tables.

- [ ] **Step 5: Run the schema contract test**

```powershell
npm.cmd test -- --runInBand agenda-schema.spec.ts
```

Expected: PASS. Delete the temporary schema contract test after the real module tests exist in Task 4.

- [ ] **Step 6: Commit**

```powershell
git add -- api/prisma/schema.prisma api/prisma/migrations api/package.json api/package-lock.json
git commit -m "feat: add agenda core data model"
```

---

### Task 4: Centralize Patient Access and Consent

**Files:**
- Create: `api/src/common/types/auth-user.ts`
- Create: `api/src/common/patient-access/patient-access.module.ts`
- Create: `api/src/common/patient-access/patient-access.service.ts`
- Create: `api/src/common/patient-access/patient-access.service.spec.ts`
- Create: `api/src/modules/consents/dto/update-consent.dto.ts`
- Create: `api/src/modules/consents/consents.service.ts`
- Create: `api/src/modules/consents/consents.controller.ts`
- Create: `api/src/modules/consents/consents.module.ts`
- Create: `api/src/modules/consents/consents.service.spec.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces: `AuthUser`, `PatientAccessService.assertProfessionalLink()`, `assertPatientSelf()`, `assertTaskAuthor()`, `ConsentsService.assertGranted()`.
- Consumes: `ProfessionalPatientLink` and `PatientConsent` Prisma delegates.

- [ ] **Step 1: Write failing access tests**

Cover active/inactive link, ADMIN denial, patient self, different patient and task author. The inactive-link test must be concrete:

```ts
it("rejects an inactive link", async () => {
  prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

  await expect(
    service.assertProfessionalLink(
      { sub: "professional-1", role: "NUTRITIONIST" },
      "patient-1",
    ),
  ).rejects.toBeInstanceOf(ForbiddenException);

  expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
    where: {
      professionalId: "professional-1",
      patientId: "patient-1",
      isActive: true,
    },
  });
});
```

Run:

```powershell
npm.cmd test -- --runInBand patient-access.service.spec.ts
```

Expected: FAIL because service does not exist.

- [ ] **Step 2: Implement the shared contracts**

`auth-user.ts`:

```ts
import { Role } from "@prisma/client";

export type AuthUser = {
  sub: string;
  role: Role;
  email?: string;
  name?: string;
};

export const CLINICAL_PROFESSIONAL_ROLES: Role[] = [
  "NUTRITIONIST",
  "PERSONAL",
  "PHYSIO",
];
```

`PatientAccessService` public API:

```ts
async assertProfessionalLink(user: AuthUser, patientId: string): Promise<void>
assertPatientSelf(user: AuthUser, patientId: string): void
assertTaskAuthor(user: AuthUser, professionalId: string): void
```

`assertProfessionalLink` rejects roles outside `CLINICAL_PROFESSIONAL_ROLES` and requires `{ professionalId: user.sub, patientId, isActive: true }`.

- [ ] **Step 3: Write failing consent tests**

Cover grant, revoke, inactive link, patient ownership, and denial when no `HEALTH_CHECK_IN` grant exists. The denial assertion is:

```ts
it("denies health check-in access without consent", async () => {
  prisma.patientConsent.findUnique.mockResolvedValue(null);

  await expect(
    service.assertGranted("patient-1", "professional-1", "HEALTH_CHECK_IN"),
  ).rejects.toBeInstanceOf(ForbiddenException);
});
```

- [ ] **Step 4: Implement consent endpoints**

Routes:

```ts
@Get("me")
listMine(@Request() req)

@Put(":professionalId/:category")
setMine(@Request() req, @Param() params, @Body() dto: UpdateConsentDto)
```

`UpdateConsentDto` contains only `@IsBoolean() granted!: boolean`. `setMine` requires patient role and writes `grantedAt` or `revokedAt` consistently with `granted`.

`ConsentsModule` exports `ConsentsService`; register it in `AppModule` so `HealthCheckInsModule` can import the contract explicitly.

`listMine` queries the patient's active `ProfessionalPatientLink` rows and left-matches `PatientConsent`, returning every active professional even before a consent row exists:

```ts
type ConsentView = {
  professional: { id: string; name: string; role: Role };
  category: ConsentCategory;
  granted: boolean;
  updatedAt: Date | null;
};
```

- [ ] **Step 5: Run tests**

```powershell
npm.cmd test -- --runInBand patient-access.service.spec.ts consents.service.spec.ts
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- api/src/common api/src/modules/consents api/src/app.module.ts
git commit -m "feat: centralize agenda access and consent"
```

---

### Task 5: Build the Recurrence Engine

**Files:**
- Create: `api/src/modules/agenda/domain/occurrence-generator.ts`
- Create: `api/src/modules/agenda/domain/occurrence-generator.spec.ts`

**Interfaces:**
- Produces: `generateOccurrenceDates(input): Date[]` and `validateRecurrenceRule(rule): void`.
- Consumes: `rrule` 2.8.1 and the process invariant `TZ=UTC`.

- [ ] **Step 1: Write failing recurrence tests**

The suite covers one-time, daily, weekly, São Paulo wall-clock time, forbidden frequencies and `endsAt`. Use real assertions, including:

```ts
it("returns one date for a non-recurring task", () => {
  const startsAt = new Date("2026-08-13T11:00:00.000Z");
  expect(generateOccurrenceDates({
    startsAt,
    timeZone: "America/Sao_Paulo",
    windowStart: new Date("2026-08-13T00:00:00.000Z"),
    windowEnd: new Date("2026-08-13T23:59:59.999Z"),
  })).toEqual([startsAt]);
});

it("rejects hourly recurrence", () => {
  expect(() => validateRecurrenceRule("FREQ=HOURLY;INTERVAL=1"))
    .toThrow(BadRequestException);
});
```

Expected weekly input/output:

```ts
const dates = generateOccurrenceDates({
  startsAt: new Date("2026-08-17T11:00:00.000Z"),
  endsAt: new Date("2026-08-31T23:59:59.999Z"),
  timeZone: "America/Sao_Paulo",
  recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE",
  windowStart: new Date("2026-08-17T00:00:00.000Z"),
  windowEnd: new Date("2026-08-24T23:59:59.999Z"),
});

expect(dates.map((date) => date.toISOString())).toEqual([
  "2026-08-17T11:00:00.000Z",
  "2026-08-19T11:00:00.000Z",
  "2026-08-24T11:00:00.000Z",
]);
```

- [ ] **Step 2: Implement strict recurrence validation**

Allow only `DAILY` and `WEEKLY`; interval must be 1–30; weekly rules require `BYDAY`; reject `COUNT`, seconds/minutes/hours frequencies and more than 366 generated dates per call.

Public input:

```ts
export type GenerateOccurrenceInput = {
  startsAt: Date;
  endsAt?: Date | null;
  timeZone: string;
  recurrenceRule?: string | null;
  windowStart: Date;
  windowEnd: Date;
};
```

Use `Intl.DateTimeFormat(..., { timeZone }).formatToParts()` to obtain wall-clock components and `datetime()` from `rrule` for `dtstart`. Create `new RRule({ ...RRule.parseString(rule), dtstart, tzid: timeZone })`, then call `between(windowStart, effectiveEnd, true)`.

- [ ] **Step 3: Run focused and full tests**

```powershell
npm.cmd test -- --runInBand occurrence-generator.spec.ts
npm.cmd test -- --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add -- api/src/modules/agenda/domain
git commit -m "feat: generate timezone-aware agenda occurrences"
```

---

### Task 6: Implement Agenda Tasks and Patient Execution

**Files:**
- Create: `api/src/modules/agenda/dto/create-agenda-task.dto.ts`
- Create: `api/src/modules/agenda/dto/update-agenda-task.dto.ts`
- Create: `api/src/modules/agenda/dto/agenda-range-query.dto.ts`
- Create: `api/src/modules/agenda/dto/complete-occurrence.dto.ts`
- Create: `api/src/modules/agenda/dto/skip-occurrence.dto.ts`
- Create: `api/src/modules/agenda/agenda.service.ts`
- Create: `api/src/modules/agenda/agenda.service.spec.ts`
- Create: `api/src/modules/agenda/agenda.controller.ts`
- Create: `api/src/modules/agenda/agenda.scheduler.ts`
- Create: `api/src/modules/agenda/agenda.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces: create/edit/pause/end/list/complete/skip API and daily adherence summary.
- Consumes: PatientAccessService, occurrence generator and Prisma agenda delegates.

- [ ] **Step 1: Write failing service tests**

Test creation transaction, idempotent `createMany`, UTC range, patient ownership, skip reason, final states, pause/end and adherence. The ownership/state test must assert the conditional update:

```ts
it("completes only the patient's actionable occurrence", async () => {
  const completedOccurrence = {
    id: "occurrence-1",
    patientId: "patient-1",
    status: "COMPLETED",
    completedAt: new Date("2026-08-13T12:00:00.000Z"),
  };
  prisma.agendaTaskOccurrence.updateMany.mockResolvedValue({ count: 1 });
  prisma.agendaTaskOccurrence.findUnique.mockResolvedValue(completedOccurrence);

  await service.completeOccurrence(
    { sub: "patient-1", role: "PATIENT" },
    "occurrence-1",
    "Executado sem dor",
  );

  expect(prisma.agendaTaskOccurrence.updateMany).toHaveBeenCalledWith({
    where: {
      id: "occurrence-1",
      patientId: "patient-1",
      status: { in: ["PENDING", "OVERDUE"] },
    },
    data: {
      status: "COMPLETED",
      completedAt: expect.any(Date),
      patientNote: "Executado sem dor",
    },
  });
});
```

- [ ] **Step 2: Implement DTO validation**

Required fields for creation:

```ts
@IsUUID() patientId!: string;
@IsString() @MaxLength(120) title!: string;
@IsEnum(AgendaTaskCategory) category!: AgendaTaskCategory;
@IsOptional() @IsString() @MaxLength(4000) instructions?: string;
@IsEnum(AgendaTaskPriority) priority!: AgendaTaskPriority;
@IsISO8601() startsAt!: string;
@IsOptional() @IsISO8601() endsAt?: string;
@IsTimeZone() timeZone!: string;
@IsOptional() @IsString() @MaxLength(300) recurrenceRule?: string;
```

Range query requires `from` and `to` ISO strings and rejects ranges greater than 31 days.

- [ ] **Step 3: Implement service transactions and state transitions**

Public API:

```ts
createTask(user: AuthUser, dto: CreateAgendaTaskDto)
updateTask(user: AuthUser, taskId: string, dto: UpdateAgendaTaskDto)
pauseTask(user: AuthUser, taskId: string)
endTask(user: AuthUser, taskId: string)
listPatientRange(user: AuthUser, patientId: string, from: Date, to: Date)
completeOccurrence(user: AuthUser, occurrenceId: string, patientNote?: string)
skipOccurrence(user: AuthUser, occurrenceId: string, reason: string)
materializeActiveTasks(windowStart: Date, windowEnd: Date)
```

All create/update/materialize operations use `$transaction`; occurrence inserts use `createMany({ skipDuplicates: true })`. Completion uses `updateMany` with `{ id, patientId: user.sub, status: { in: ["PENDING", "OVERDUE"] } }` and throws `ConflictException` when count is zero.

`listPatientRange` returns the patient identity, occurrences including `task.professional { id, name, role }` and this exact summary:

```ts
{
  patient: { id: patient.id, name: patient.name },
  occurrences,
  summary: {
    actionable,
    completed,
    percentage: actionable === 0 ? 0 : Math.round((completed / actionable) * 100),
  },
}
```

- [ ] **Step 4: Implement guarded routes**

```text
POST   /agenda/tasks                         professional
PATCH  /agenda/tasks/:id                     task author
POST   /agenda/tasks/:id/pause               task author
POST   /agenda/tasks/:id/end                 task author
GET    /agenda/patient/:patientId            self or linked professional
POST   /agenda/occurrences/:id/complete      patient self
POST   /agenda/occurrences/:id/skip          patient self
```

Use `@UseGuards(JwtAuthGuard, RolesGuard)` and explicit `@Roles` only where the role set is narrower. Services still repeat ownership/link checks.

- [ ] **Step 5: Add daily materialization and overdue processing**

`AgendaScheduler` uses `@Cron("0 5 1 * * *", { timeZone: "UTC" })` to materialize the next 30 days, then marks past `PENDING` occurrences `OVERDUE`. Both operations are idempotent.

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd test -- --runInBand agenda.service.spec.ts occurrence-generator.spec.ts
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- api/src/modules/agenda api/src/app.module.ts
git commit -m "feat: add agenda task lifecycle API"
```

---

### Task 7: Implement Health Check-ins with Controlled Sharing

**Files:**
- Create: `api/src/modules/health-check-ins/dto/create-health-check-in.dto.ts`
- Create: `api/src/modules/health-check-ins/health-check-ins.service.ts`
- Create: `api/src/modules/health-check-ins/health-check-ins.service.spec.ts`
- Create: `api/src/modules/health-check-ins/health-check-ins.controller.ts`
- Create: `api/src/modules/health-check-ins/health-check-ins.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces: create/list check-ins.
- Consumes: PatientAccessService and `ConsentsService.assertGranted(..., "HEALTH_CHECK_IN")`.

- [ ] **Step 1: Write failing tests**

Test empty payload, partial payload, numeric limits, patient self, linked professional with consent and 31-day range. The empty and consent cases must include these assertions:

```ts
it("rejects an empty check-in", async () => {
  await expect(
    service.create({ sub: "patient-1", role: "PATIENT" }, {}),
  ).rejects.toBeInstanceOf(BadRequestException);
});

it("requires health consent for a professional", async () => {
  const range = {
    from: new Date("2026-08-01T00:00:00.000Z"),
    to: new Date("2026-08-31T23:59:59.999Z"),
  };
  await service.listForPatient(
    { sub: "professional-1", role: "PHYSIO" },
    "patient-1",
    range,
  );

  expect(patientAccess.assertProfessionalLink).toHaveBeenCalled();
  expect(consents.assertGranted).toHaveBeenCalledWith(
    "patient-1",
    "professional-1",
    "HEALTH_CHECK_IN",
  );
});
```

- [ ] **Step 2: Implement the DTO**

```ts
export class CreateHealthCheckInDto {
  @IsOptional() @IsInt() @Min(0) @Max(20000) waterMl?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) painLevel?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) mood?: number;
  @IsOptional() @IsString() @MaxLength(2000) symptoms?: string;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsOptional() @IsISO8601() recordedAt?: string;
}
```

The service explicitly rejects the DTO when every data field is `undefined` or blank.

- [ ] **Step 3: Implement endpoints**

```text
POST /health-check-ins                         PATIENT, patientId from JWT
GET  /health-check-ins/patient/:patientId     self or consented linked professional
```

Never accept `patientId` in the create body.

- [ ] **Step 4: Run tests and build**

```powershell
npm.cmd test -- --runInBand health-check-ins.service.spec.ts consents.service.spec.ts
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/modules/health-check-ins api/src/app.module.ts
git commit -m "feat: add consent-aware health check-ins"
```

---

### Task 8: Build the Patient Agenda Experience

**Files:**
- Create: `web/types/agenda.ts`
- Create: `web/hooks/features/useAgenda.ts`
- Create: `web/hooks/features/useHealthCheckIn.ts`
- Create: `web/components/features/agenda/AgendaProgress.tsx`
- Create: `web/components/features/agenda/AgendaTaskCard.tsx`
- Create: `web/components/features/agenda/HealthCheckInDialog.tsx`
- Create: `web/components/features/agenda/ConsentSharingCard.tsx`
- Create: `web/app/paciente/agenda/page.tsx`
- Create: `web/cypress/e2e/agenda-patient.cy.ts`
- Modify: `web/app/paciente/layout.tsx`

**Interfaces:**
- Produces: `/paciente/agenda` and reusable agenda components.
- Consumes: agenda/check-in/consent HTTP APIs and `useAuth().user.sub`.

- [ ] **Step 1: Write the failing Cypress journey**

Intercept `/auth/me`, `GET /agenda/patient/patient-e2e*`, completion, skipping, check-in, `GET /consents/me` and `PUT /consents/professional-1/HEALTH_CHECK_IN`. Alias the consent update as `updateConsent`. Assert:

```ts
cy.contains("Sua agenda de hoje").should("be.visible")
cy.contains("60% concluído").should("be.visible")
cy.contains("Tomar suplemento").should("be.visible")
cy.contains("Concluir").click()
cy.wait("@completeTask")
cy.contains("Tarefa concluída").should("be.visible")
cy.contains("Check-in de saúde").click()
cy.get('input[name="painLevel"]').type("4")
cy.contains("Salvar check-in").click()
cy.wait("@createCheckIn")
cy.contains("Compartilhamento de saúde").click()
cy.get('[data-testid="consent-professional-1"]').click()
cy.wait("@updateConsent")
```

Run with Next dev server; expected: FAIL because route does not exist.

- [ ] **Step 2: Define frontend contracts**

`web/types/agenda.ts` exports enums as string unions plus:

```ts
export type AgendaOccurrence = {
  id: string;
  scheduledFor: string;
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "OVERDUE" | "CANCELLED";
  completedAt: string | null;
  skipReason: string | null;
  patientNote: string | null;
  task: {
    id: string;
    title: string;
    category: AgendaTaskCategory;
    instructions: string | null;
    priority: "LOW" | "NORMAL" | "HIGH";
    professional: { id: string; name: string; role: string };
  };
};

export type AgendaDay = {
  patient: { id: string; name: string };
  occurrences: AgendaOccurrence[];
  summary: { actionable: number; completed: number; percentage: number };
};
```

- [ ] **Step 3: Implement hooks with refetch after mutation**

`useAgenda(patientId, selectedDate)` exposes:

```ts
{ data, loading, error, complete, skip, refetch, mutatingId }
```

Build UTC `from/to` query boundaries from the browser-selected local day. Errors use the API message when safe and a generic Portuguese fallback.

- [ ] **Step 4: Build focused UI components**

- `AgendaProgress`: progress bar, completed/actionable counts.
- `AgendaTaskCard`: chronological time, category badge, author, instructions, status and actions.
- `HealthCheckInDialog`: optional water/dor/humor/sintomas/observações; disable submit when empty.
- `ConsentSharingCard`: lista apenas profissionais com vínculo ativo e permite conceder/revogar `HEALTH_CHECK_IN` individualmente.
- Page: date navigation, loading skeleton, empty state and ordered list.

Use existing `Button`, `Card`, `Dialog`, `Input`, `Textarea`, `Select`, `Progress`, `sonner` and Lucide icons. No new design-system dependency.

- [ ] **Step 5: Add navigation**

In patient nav, add before Dieta:

```tsx
{ name: "Agenda", href: "/paciente/agenda", icon: CalendarDays }
```

Ensure mobile remains usable with six items by allowing horizontal spacing/scroll rather than shrinking tap targets below 44px.

- [ ] **Step 6: Verify**

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
npx.cmd cypress run --spec cypress/e2e/agenda-patient.cy.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- web/types/agenda.ts web/hooks/features/useAgenda.ts web/hooks/features/useHealthCheckIn.ts web/components/features/agenda web/app/paciente/agenda web/app/paciente/layout.tsx web/cypress/e2e/agenda-patient.cy.ts
git commit -m "feat: add patient daily agenda experience"
```

---

### Task 9: Build Professional Planning and Monitoring

**Files:**
- Create: `web/components/features/agenda/AgendaTaskDialog.tsx`
- Create: `web/components/features/agenda/PatientAgendaSummary.tsx`
- Create: `web/components/features/agenda/ConsentStatus.tsx`
- Create: `web/app/membros/[id]/agenda/page.tsx`
- Create: `web/cypress/e2e/agenda-professional.cy.ts`
- Modify: `web/app/membros/page.tsx`

**Interfaces:**
- Produces: professional route to create/manage tasks and view allowed check-ins.
- Consumes: `POST/PATCH /agenda/tasks`, patient-range API, consent-aware check-in API.

- [ ] **Step 1: Write the failing Cypress journey**

Intercept professional auth, the members list, agenda list, task creation and check-ins. Assert creation sends:

```json
{
  "patientId": "patient-e2e",
  "title": "Hidratação da tarde",
  "category": "HYDRATION",
  "priority": "NORMAL",
  "startsAt": "2026-08-13T18:00:00.000Z",
  "timeZone": "America/Sao_Paulo",
  "recurrenceRule": "FREQ=DAILY;INTERVAL=1"
}
```

Also assert a `403` check-in response renders “Paciente ainda não compartilhou estes registros”, not a generic crash.

- [ ] **Step 2: Implement task creation/edit form**

Fields: title, category, priority, local date/time, IANA timezone defaulted from `Intl.DateTimeFormat().resolvedOptions().timeZone`, recurrence `ONCE/DAILY/WEEKLY`, weekday selection for weekly, end date and instructions.

Translate controls into:

```ts
const recurrenceRule = recurrence === "ONCE"
  ? undefined
  : recurrence === "DAILY"
    ? "FREQ=DAILY;INTERVAL=1"
    : `FREQ=WEEKLY;INTERVAL=1;BYDAY=${selectedDays.join(",")}`
```

Require at least one weekday for weekly recurrence.

- [ ] **Step 3: Implement professional page**

Show patient name, selected date, adherence summary, task list, create button and actions limited to tasks authored by the logged-in professional. Check-in section handles three distinct states: loading, consent denied and records available.

- [ ] **Step 4: Link from the existing members list**

In the clean `web/app/membros/page.tsx`, add an agenda action beside each patient and deliberately leave the already-dirty `web/app/membros/[id]/page.tsx` untouched:

```tsx
<Button asChild variant="outline" size="sm">
  <Link href={`/membros/${patient.id}/agenda`}>
    <CalendarDays className="mr-2 h-4 w-4" />
    Agenda
  </Link>
</Button>
```

- [ ] **Step 5: Verify**

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
npx.cmd cypress run --spec cypress/e2e/agenda-professional.cy.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- web/components/features/agenda web/app/membros/[id]/agenda web/app/membros/page.tsx web/cypress/e2e/agenda-professional.cy.ts
git commit -m "feat: add professional agenda planning"
```

---

### Task 10: Verify the Complete Core Journey on the Local Database

**Files:**
- Create: `api/test/agenda.e2e-spec.ts`
- Modify: `api/test/jest-e2e.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: every API and UI contract from Tasks 3–9.
- Produces: evidence that the core journey works and commands for local use.

- [ ] **Step 1: Write the failing API journey test**

Build `AppModule`, override `JwtAuthGuard` with a test guard that maps `x-test-user-id` and `x-test-role` headers to `req.user`, and use the real `RolesGuard`.

Before deleting fixtures, enforce the safety assertion:

```ts
expect(process.env.DIRECT_URL).toBe(
  "postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test",
);
```

Test this sequence:

1. create professional, patient and active link fixtures;
2. professional creates daily task;
3. patient lists the day and completes occurrence;
4. patient creates health check-in;
5. professional receives denial before consent;
6. patient grants `HEALTH_CHECK_IN` consent;
7. professional reads check-in;
8. inactive link blocks both agenda and check-in.

- [ ] **Step 2: Run the test before final fixes**

```powershell
$env:DIRECT_URL="postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test"
$env:DATABASE_URL=$env:DIRECT_URL
$env:JWT_SECRET="agenda-e2e-only"
$env:ALLOWED_ORIGINS="http://localhost:3001"
$env:TZ="UTC"
npm.cmd run test:e2e -- --runInBand agenda.e2e-spec.ts
```

Expected: FAIL at the first incomplete integration; fix only the failing contract, then rerun.

- [ ] **Step 3: Document local startup**

README must include:

```powershell
docker compose up --build -d
```

and explain that Docker uses the local `db` service, applies committed migrations, serves API on 3000 and web on 3001. Remote baseline reconciliation points only to `docs/database-baseline.md`.

- [ ] **Step 4: Run the full verification matrix**

Backend:

```powershell
cd api
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand agenda.e2e-spec.ts
npm.cmd run build
```

Frontend:

```powershell
cd web
npx.cmd tsc --noEmit
npm.cmd run build
npx.cmd cypress run --spec cypress/e2e/agenda-patient.cy.ts,cypress/e2e/agenda-professional.cy.ts
```

Repository and Docker:

```powershell
git diff --check
git status --short
docker compose config
docker compose up --build -d
docker compose ps
```

Expected: all commands PASS. `git status` may show only the user's previously existing unrelated changes; generated Prisma/Next files must be reviewed before completion.

- [ ] **Step 5: Perform the acceptance review**

Confirm:

- patient sees chronological tasks and progress;
- patient can complete/skip only their own occurrences;
- professional can manage only authored tasks for actively linked patients;
- check-in visibility changes immediately with consent;
- recurrence generation is idempotent;
- no write reached the remote database;
- no Cypress credential remains;
- `DailyTracking` was not modified by agenda execution.

- [ ] **Step 6: Commit**

```powershell
git add -- api/test/agenda.e2e-spec.ts api/test/jest-e2e.json README.md
git commit -m "test: cover agenda core journey"
```

---

## Follow-up Plans

After this core passes its acceptance matrix:

1. `agenda-appointments` — availability rules, slots, hybrid request/counterproposal flow, conflict protection and appointment UI.
2. `agenda-notifications-email` — internal inbox, persistent outbox, SMTP adapter, retries and user preferences.
3. `agenda-analytics-alerts` — adherence trends, configurable warnings and multidisciplinary summaries.
