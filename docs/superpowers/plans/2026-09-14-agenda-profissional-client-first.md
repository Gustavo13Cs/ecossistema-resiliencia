# Agenda Profissional Client-first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma Agenda Profissional de atendimentos vinculados a `Client`, com isolamento por conta, prevenção de conflitos, calendário diário/semanal/mensal e ciclo operacional completo.

**Architecture:** Um novo módulo NestJS `appointments` será aditivo e independente da agenda legada de paciente. `Appointment` e `AppointmentEvent` persistirão o estado e o histórico; o frontend Next.js consumirá o intervalo autorizado com TanStack Query e dividirá calendário, formulário e painel de detalhes em componentes focados.

**Tech Stack:** NestJS 11, Prisma 7.10, PostgreSQL 16, Jest 30, Next.js 16, React 19, TypeScript, TanStack Query 5, date-fns 4, Radix UI, Tailwind CSS 4, Vitest 3 e Cypress 15.

**Spec:** `docs/superpowers/specs/2026-09-14-agenda-profissional-client-first-design.md`

## Global Constraints

- O recurso novo é `Appointment`; `AgendaTask` permanece legado e não é importado pela rota profissional.
- Todo acesso filtra `professionalId` da sessão e valida que `clientId` pertence à mesma conta.
- `ADMIN` e `PATIENT` não acessam o novo módulo.
- Alterações em `api/prisma/schema.prisma` e uma migration aditiva foram aprovadas pelo mantenedor em 14 de setembro de 2026.
- Nenhuma migration será executada contra Supabase ou outro banco remoto durante o desenvolvimento.
- Datas persistidas são UTC e cada atendimento conserva um fuso IANA.
- Intervalos usam semântica `[startsAt, endsAt)`; `SCHEDULED` e `CONFIRMED` bloqueiam horário.
- Listagens aceitam no máximo 42 dias.
- Atualizações usam `expectedUpdatedAt` e retornam `409` quando o snapshot estiver obsoleto.
- A UI usa dados reais e diferencia loading, empty, error, conflict e ready.
- Nenhum dado clínico ou token novo será persistido em `localStorage`, `sessionStorage` ou cache persistente.
- Acessibilidade alvo: WCAG 2.2 AA, teclado completo, foco visível e alvos mínimos de 44 px.
- Todo comportamento novo segue Red, Green e Refactor; falha por configuração ou erro de importação não conta como Red válido.
- No PowerShell, usar `npm.cmd` e `npx.cmd`.

---

## File Map

### Persistência e API

- Modify: `api/prisma/schema.prisma` — enums, relações e modelos aditivos.
- Create: `api/prisma/migrations/20260914133000_add_professional_appointments/migration.sql` — tabelas, FKs e índices.
- Create: `api/test/appointments-schema.e2e-spec.ts` — contrato executável da migration no PostgreSQL isolado.
- Create: `api/src/modules/appointments/appointments.service.ts` — ownership, intervalos, concorrência e ciclo de estados.
- Create: `api/src/modules/appointments/appointments.service.spec.ts` — testes unitários do domínio.
- Create: `api/src/modules/appointments/appointments.controller.ts` — endpoints autenticados.
- Create: `api/src/modules/appointments/appointments.module.ts` — composição do módulo.
- Create: `api/src/modules/appointments/dto/create-appointment.dto.ts` — validação de criação.
- Create: `api/src/modules/appointments/dto/update-appointment.dto.ts` — validação de edição otimista.
- Create: `api/src/modules/appointments/dto/appointment-range-query.dto.ts` — intervalo e filtros.
- Create: `api/src/modules/appointments/dto/appointment-action.dto.ts` — snapshot para transições.
- Create: `api/src/modules/appointments/dto/cancel-appointment.dto.ts` — snapshot e motivo.
- Modify: `api/src/app.module.ts` — registrar `AppointmentsModule`.
- Create: `api/test/appointments.e2e-spec.ts` — persistência, ownership, conflito e lifecycle reais.

### Frontend

- Create: `web/types/appointment.ts` — contratos da resposta e dos comandos.
- Create: `web/lib/appointment-period.ts` — cálculo determinístico de dia, semana e mês.
- Create: `web/lib/appointment-period.test.ts` — testes de datas e grade de 42 dias.
- Modify: `web/lib/query-keys.ts` — chave por sessão, intervalo e filtros.
- Create: `web/hooks/features/useAppointments.ts` — leitura, mutações e invalidação.
- Create: `web/hooks/features/useAppointments.test.tsx` — contrato HTTP e isolamento da query key.
- Create: `web/components/features/appointments/AgendaToolbar.tsx` — período, visão e filtros.
- Create: `web/components/features/appointments/AppointmentDialog.tsx` — criação e edição.
- Create: `web/components/features/appointments/AppointmentDetails.tsx` — detalhes, histórico e ações.
- Create: `web/components/features/appointments/AppointmentStatusBadge.tsx` — rótulo e ícone de estado.
- Create: `web/components/features/appointments/DayAgenda.tsx` — linha do tempo/lista diária.
- Create: `web/components/features/appointments/WeekAgenda.tsx` — semana responsiva.
- Create: `web/components/features/appointments/MonthAgenda.tsx` — grade mensal e overflow `+N`.
- Create: `web/components/features/appointments/AppointmentCalendar.test.tsx` — estados, ações e navegação.
- Modify: `web/app/agenda/page.tsx` — orquestração da superfície profissional.
- Create: `web/app/agenda/page.test.tsx` — jornada unitária da página.
- Modify: `web/lib/professional-workspace.ts` — Agenda nas três atuações.
- Create: `web/cypress/e2e/professional-agenda-real.cy.ts` — jornada real responsiva.
- Modify: `web/package.json` — incluir a jornada no script `e2e:real`.

### Coordenação e documentação

- Modify: `docs/TASKS.md` — marcar a fase como concluída somente após todos os gates.
- Modify: `docs/agents/CODEX_STATUS.md` — registrar resultado e impedimentos reais.
- Create: `.impeccable/surfaces/web-app-agenda-page-tsx.md` — brief durável da superfície após o build.

---

### Task 1: Persistência aditiva e contrato do schema

**Files:**

- Create: `api/test/appointments-schema.e2e-spec.ts`
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/20260914133000_add_professional_appointments/migration.sql`

**Interfaces:**

- Produces: Prisma models `Appointment`, `AppointmentEvent` and enums `AppointmentKind`, `AppointmentStatus`, `AppointmentModality`, `AppointmentEventType`.
- Consumes: `User`, `Client`, UUID defaults and current migration conventions.

- [ ] **Step 1: Write the failing database behavior test**

```ts
import { PrismaService } from '../src/infra/database/prisma.service';

describe('professional appointments migration', () => {
  const prisma = new PrismaService();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('creates both appointment tables through versioned migrations', async () => {
    const [tables] = await prisma.$queryRaw<
      Array<{ appointments: string | null; appointment_events: string | null }>
    >`SELECT
      to_regclass('public.appointments')::text AS appointments,
      to_regclass('public.appointment_events')::text AS appointment_events`;

    expect(tables).toEqual({
      appointments: 'appointments',
      appointment_events: 'appointment_events',
    });
  });
});
```

- [ ] **Step 2: Run Red and confirm an assertion failure**

Run:

```powershell
docker compose -f docker-compose.test.yml up -d db-test
cd api
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test?schema=public'
$env:DIRECT_URL=$env:DATABASE_URL
npx.cmd prisma migrate deploy
npm.cmd run test:e2e -- --runInBand test/appointments-schema.e2e-spec.ts
```

Expected: FAIL because both `to_regclass` results are `null`; connection and query must succeed.

- [ ] **Step 3: Add enums, relations and models to Prisma**

Use these exact enum members:

```prisma
enum AppointmentKind {
  FIRST_VISIT
  FOLLOW_UP
  ASSESSMENT
  SESSION
  OTHER
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentModality {
  IN_PERSON
  ONLINE
}

enum AppointmentEventType {
  CREATED
  UPDATED
  RESCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

`Appointment` exposes `events AppointmentEvent[]`, stores all fields from the spec and maps to `appointments`. `AppointmentEvent` maps to `appointment_events`. Add named relations from `User` and `Client` without changing existing relation names.

- [ ] **Step 4: Add the additive SQL migration**

Create the four enum types, both tables, foreign keys with `ON DELETE RESTRICT`, and these indexes:

```sql
CREATE INDEX "appointments_professionalId_startsAt_idx"
ON "appointments"("professionalId", "startsAt");

CREATE INDEX "appointments_professionalId_status_startsAt_idx"
ON "appointments"("professionalId", "status", "startsAt");

CREATE INDEX "appointments_clientId_startsAt_idx"
ON "appointments"("clientId", "startsAt");

CREATE INDEX "appointment_events_appointmentId_createdAt_idx"
ON "appointment_events"("appointmentId", "createdAt");
```

- [ ] **Step 5: Run Green and Prisma gates**

Run with the same explicit local-test `DATABASE_URL` from Step 2:

```powershell
cd api
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run test:e2e -- --runInBand test/appointments-schema.e2e-spec.ts
```

Expected: schema valid, Prisma Client generated, migration applied and test PASS.

- [ ] **Step 6: Commit the persistence foundation**

```powershell
git add -- api/prisma/schema.prisma api/prisma/migrations/20260914133000_add_professional_appointments/migration.sql api/test/appointments-schema.e2e-spec.ts
git commit -m "feat: add professional appointment persistence"
```

### Task 2: Criação, listagem e prevenção de conflito

**Files:**

- Create: `api/src/modules/appointments/appointments.service.spec.ts`
- Create: `api/src/modules/appointments/appointments.service.ts`

**Interfaces:**

- Produces: `AppointmentsService.create(user, input)`, `list(user, query)` and `findOne(user, id)`.
- Consumes: generated Prisma types and `ClientAccessService.getOwnedClient()`.

- [ ] **Step 1: Write failing tests for creation and tenant-scoped list**

The fixtures use `2026-09-15T13:00:00.000Z` to `2026-09-15T14:00:00.000Z`. Freeze the clock at `2026-09-14T12:00:00.000Z`.

```ts
it('returns the created appointment for an active owned client', async () => {
  prisma.client.findFirst.mockResolvedValue(ownedActiveClient);
  prisma.appointment.findFirst.mockResolvedValue(null);
  prisma.appointment.create.mockResolvedValue(appointment);

  await expect(service.create(professional, createInput)).resolves.toMatchObject({
    id: appointment.id,
    professionalId: professional.sub,
    clientId: createInput.clientId,
    status: 'SCHEDULED',
  });
});

it('returns not found when a professional requests an unknown appointment', async () => {
  prisma.appointment.findFirst.mockResolvedValue(null);
  await expect(
    service.findOne(otherProfessional, appointment.id),
  ).rejects.toBeInstanceOf(NotFoundException);
});
```

Add separate failing cases for archived clients, adjacent intervals, overlapping intervals and ranges above 42 days.

- [ ] **Step 2: Run Red**

Run: `cd api; npm.cmd test -- --runInBand src/modules/appointments/appointments.service.spec.ts`

Expected: FAIL on missing service behavior, after the test suite compiles.

- [ ] **Step 3: Implement the minimum service foundation**

Use these public signatures:

```ts
create(user: AuthUser, dto: CreateAppointmentInput): Promise<AppointmentWithClient>
list(user: AuthUser, query: AppointmentRangeInput): Promise<AppointmentWithClient[]>
findOne(user: AuthUser, appointmentId: string): Promise<AppointmentWithDetails>
```

Creation must:

1. load the owned client and reject `ARCHIVED` with `ConflictException`;
2. parse and validate time, duration and IANA timezone;
3. open a Prisma `Serializable` transaction;
4. query overlap using `startsAt < newEnd` and `endsAt > newStart`;
5. create the appointment and `CREATED` event in the same transaction;
6. map Prisma `P2034` to `ConflictException`.

List and findOne must include only `{ id, name, status }` from `Client`; findOne also includes ordered events. Cross-tenant identifiers return `NotFoundException`.

- [ ] **Step 4: Run Green and refactor helpers**

Run: `cd api; npm.cmd test -- --runInBand src/modules/appointments/appointments.service.spec.ts`

Expected: all service tests PASS. Extract focused helpers `parseSchedule`, `assertRange`, `blockingOverlapWhere` and `safeAppointmentConflict` only after Green.

- [ ] **Step 5: Commit the service foundation**

```powershell
git add -- api/src/modules/appointments/appointments.service.ts api/src/modules/appointments/appointments.service.spec.ts
git commit -m "feat: create and list professional appointments"
```

### Task 3: Edição otimista, estados e histórico

**Files:**

- Modify: `api/src/modules/appointments/appointments.service.spec.ts`
- Modify: `api/src/modules/appointments/appointments.service.ts`

**Interfaces:**

- Produces: `update`, `confirm`, `complete`, `markNoShow` and `cancel` methods.
- Consumes: `expectedUpdatedAt` snapshots and Task 2 ownership helpers.

- [ ] **Step 1: Add the transition matrix as failing parameterized tests**

```ts
it.each([
  ['SCHEDULED', 'CONFIRMED', 'confirm'],
  ['SCHEDULED', 'COMPLETED', 'complete'],
  ['CONFIRMED', 'COMPLETED', 'complete'],
  ['SCHEDULED', 'NO_SHOW', 'markNoShow'],
  ['CONFIRMED', 'CANCELLED', 'cancel'],
] as const)('%s can transition to %s', async (from, to, method) => {
  prisma.appointment.findFirst.mockResolvedValue({ ...appointment, status: from });
  prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
  prisma.appointment.findFirst
    .mockResolvedValueOnce({ ...appointment, status: from })
    .mockResolvedValueOnce({ ...appointment, status: to });

  await expect(
    service[method](professional, appointment.id, actionFor(method)),
  ).resolves.toMatchObject({
    id: appointment.id,
    status: to,
  });
});
```

Add explicit failing tests for final states, early completion/no-show, cancellation reason, stale snapshots and confirmed reschedule returning to `SCHEDULED`.

- [ ] **Step 2: Run Red**

Run: `cd api; npm.cmd test -- --runInBand src/modules/appointments/appointments.service.spec.ts`

Expected: FAIL on the first unimplemented transition.

- [ ] **Step 3: Implement update and explicit state commands**

Use update predicates containing all three values:

```ts
where: {
  id: appointmentId,
  professionalId: user.sub,
  updatedAt: new Date(expectedUpdatedAt),
}
```

Every successful change writes one `AppointmentEvent` in the same transaction. A zero-count `updateMany` reloads by `id + professionalId`: absent means `404`; present means stale snapshot and returns `409`.

- [ ] **Step 4: Run Green and the complete appointment unit suite**

Run: `cd api; npm.cmd test -- --runInBand src/modules/appointments`

Expected: PASS with no warning or open handle.

- [ ] **Step 5: Commit lifecycle behavior**

```powershell
git add -- api/src/modules/appointments/appointments.service.ts api/src/modules/appointments/appointments.service.spec.ts
git commit -m "feat: add appointment lifecycle and audit history"
```

### Task 4: DTOs, controller, module and API e2e

**Files:**

- Create: `api/src/modules/appointments/dto/*.ts`
- Create: `api/src/modules/appointments/appointments.controller.ts`
- Create: `api/src/modules/appointments/appointments.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/appointments.e2e-spec.ts`

**Interfaces:**

- Produces: authenticated `/appointments` HTTP contract from the approved spec.
- Consumes: Task 2 and Task 3 service methods.

- [ ] **Step 1: Write the failing HTTP journey first**

Create `api/test/appointments.e2e-spec.ts` against the existing `AppModule`. The first request uses a valid authenticated professional and a valid owned client fixture:

```ts
await request(app.getHttpServer())
  .post('/appointments')
  .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
  .send(validAppointment)
  .expect(201);
```

In the same Red file, send malformed UUID, invalid timezone, non-HTTPS meeting URL, excessive notes and absent `expectedUpdatedAt` to their respective endpoints and expect `400`. These assertions exercise the real validation pipe and route registration.

- [ ] **Step 2: Run Red**

Run: `cd api; npm.cmd run test:e2e -- --runInBand test/appointments.e2e-spec.ts`

Expected: FAIL with HTTP `404` instead of the expected `201`; the Nest application must boot successfully.

- [ ] **Step 3: Implement DTOs, controller and module wiring**

Controller routes are exact:

```text
GET    /appointments
GET    /appointments/:id
POST   /appointments
PATCH  /appointments/:id
POST   /appointments/:id/confirm
POST   /appointments/:id/complete
POST   /appointments/:id/no-show
POST   /appointments/:id/cancel
```

All routes use `@Roles('NUTRITIONIST', 'PERSONAL', 'PHYSIO')`. IDs use `ParseUUIDPipe`.

- [ ] **Step 4: Run controller Green and API build**

Run:

```powershell
cd api
npm.cmd test -- --runInBand src/modules/appointments
npm.cmd run build
```

Expected: PASS and Nest build exit 0.

- [ ] **Step 5: Write and run the real e2e journey**

The test creates two professionals and one active client for each. It must assert:

```ts
expect(overlapResponse.status).toBe(409);
expect(otherTenantRead.status).toBe(404);
expect(adminList.status).toBe(403);
expect(list.body[0].client).toEqual({
  id: clientA.id,
  name: clientA.name,
  status: 'ACTIVE',
});
```

Run: `cd api; npm.cmd run test:e2e -- --runInBand test/appointments.e2e-spec.ts`

Expected: complete HTTP journey PASS against PostgreSQL test database.

- [ ] **Step 6: Commit the HTTP vertical**

```powershell
git add -- api/src/app.module.ts api/src/modules/appointments api/test/appointments.e2e-spec.ts
git commit -m "feat: expose professional appointments api"
```

### Task 5: Frontend contracts, periods and server-state hook

**Files:**

- Create: `web/types/appointment.ts`
- Create: `web/lib/appointment-period.ts`
- Create: `web/lib/appointment-period.test.ts`
- Modify: `web/lib/query-keys.ts`
- Create: `web/hooks/features/useAppointments.ts`
- Create: `web/hooks/features/useAppointments.test.tsx`

**Interfaces:**

- Produces: `Appointment`, `AppointmentFilters`, `AgendaView`, `getAppointmentPeriod()` and `useAppointments()`.
- Consumes: `/appointments`, `api`, `useAuth`, TanStack Query and `date-fns`.

- [ ] **Step 1: Write failing period tests against a wished-for API**

```ts
expect(getAppointmentPeriod('day', '2026-09-14', 'America/Sao_Paulo')).toEqual({
  from: '2026-09-14T03:00:00.000Z',
  to: '2026-09-15T03:00:00.000Z',
});

const month = getAppointmentPeriod('month', '2026-09-14', 'America/Sao_Paulo');
expect(differenceInCalendarDays(new Date(month.to), new Date(month.from))).toBe(42);
```

Include a week beginning Monday and a DST-aware IANA case. Use an existing compiling test seam before asserting the missing behavior.

- [ ] **Step 2: Run period Red**

Run: `cd web; npm.cmd test -- lib/appointment-period.test.ts`

Expected: FAIL on incorrect or missing period values, not on test configuration.

- [ ] **Step 3: Implement types and period utility**

`getAppointmentPeriod(view, selectedDate, timeZone)` returns an exclusive UTC `[from, to)` interval. Month always begins on the Monday before or equal to the first calendar day and ends 42 days later.

- [ ] **Step 4: Write failing hook tests**

Prove the request and cache identity:

```ts
expect(http.history.get[0]?.params).toEqual({
  from: period.from,
  to: period.to,
  clientId: undefined,
  status: undefined,
});
expect(queryClient.getQueryCache().find({
  queryKey: ['appointments', 'professional-one', period.from, period.to, 'all', 'all'],
})).toBeDefined();
```

Add mutation tests for `409` preservation, safe fallback errors and targeted invalidation.

- [ ] **Step 5: Implement `useAppointments` and run Green**

Return `{ appointments, state, error, conflict, create, update, transition, refetch }`. State is exactly `loading | ready | empty | network-error | server-error | unauthorized`.

Run:

```powershell
cd web
npm.cmd test -- lib/appointment-period.test.ts hooks/features/useAppointments.test.tsx
npm.cmd run typecheck
```

Expected: tests PASS and TypeScript exit 0.

- [ ] **Step 6: Commit the frontend data layer**

```powershell
git add -- web/types/appointment.ts web/lib/appointment-period.ts web/lib/appointment-period.test.ts web/lib/query-keys.ts web/hooks/features/useAppointments.ts web/hooks/features/useAppointments.test.tsx
git commit -m "feat: add appointment calendar data layer"
```

### Task 6: Appointment form, details and status actions

**Files:**

- Create: `web/components/features/appointments/AppointmentDialog.tsx`
- Create: `web/components/features/appointments/AppointmentDetails.tsx`
- Create: `web/components/features/appointments/AppointmentStatusBadge.tsx`
- Create: `web/components/features/appointments/AppointmentCalendar.test.tsx`

**Interfaces:**

- Produces: accessible create/edit dialog and details panel callbacks.
- Consumes: active `Client[]`, `Appointment`, workspace terminology and Task 5 hook commands.

- [ ] **Step 1: Write failing UI tests**

```tsx
await user.click(screen.getByRole('button', { name: 'Novo atendimento' }));
expect(screen.getByRole('dialog', { name: 'Novo atendimento' })).toBeVisible();
await user.selectOptions(screen.getByLabelText('Cliente'), client.id);
await user.type(screen.getByLabelText('Data e hora inicial'), '2026-09-15T10:00');
expect(screen.getByRole('button', { name: 'Salvar atendimento' })).toBeEnabled();
```

Add cases for modality-specific fields, archived-client exclusion, cancel confirmation, disabled final-state actions and `409` reload copy.

- [ ] **Step 2: Run Red**

Run: `cd web; npm.cmd test -- components/features/appointments/AppointmentCalendar.test.tsx`

Expected: FAIL on absent controls after the test harness renders successfully.

- [ ] **Step 3: Implement components with the project primitives**

Use existing `Dialog`, `AlertDialog`, `Select`, `Input`, `Textarea`, `Button` and `Badge`. Do not introduce a new form or calendar dependency. Default duration is 60 minutes and detected timezone falls back to `America/Sao_Paulo`.

- [ ] **Step 4: Run Green, keyboard assertions and typecheck**

Run:

```powershell
cd web
npm.cmd test -- components/features/appointments/AppointmentCalendar.test.tsx
npm.cmd run typecheck
```

Expected: PASS; focus returns to the trigger after closing dialogs.

- [ ] **Step 5: Commit the appointment interactions**

```powershell
git add -- web/components/features/appointments
git commit -m "feat: add appointment editing workflow"
```

### Task 7: Calendar views and professional Agenda page

**Files:**

- Create: `web/components/features/appointments/AgendaToolbar.tsx`
- Create: `web/components/features/appointments/DayAgenda.tsx`
- Create: `web/components/features/appointments/WeekAgenda.tsx`
- Create: `web/components/features/appointments/MonthAgenda.tsx`
- Modify: `web/app/agenda/page.tsx`
- Create: `web/app/agenda/page.test.tsx`
- Modify: `web/lib/professional-workspace.ts`

**Interfaces:**

- Produces: full `/agenda` surface and shared navigation for all professional roles.
- Consumes: Task 5 data hook and Task 6 interactions.

- [ ] **Step 1: Write the page Red against the current placeholder**

```tsx
renderAgendaPage();
expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeVisible();
expect(screen.getByRole('button', { name: 'Novo atendimento' })).toBeVisible();
expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'true');
expect(screen.queryByText('Em planejamento')).not.toBeInTheDocument();
```

Add tests for loading, empty, API error with retry, week navigation, month `+N`, selected day, role terminology and Agenda navigation for all three roles.

- [ ] **Step 2: Run Red**

Run: `cd web; npm.cmd test -- app/agenda/page.test.tsx`

Expected: FAIL because the current page still renders `FeaturePlaceholder`.

- [ ] **Step 3: Implement the route and focused calendar views**

The page owns only `view`, `selectedDate`, `filters`, selected appointment and dialog state. Each calendar receives already filtered appointments plus callbacks. Empty and error states use `AsyncState`.

Desktop renders the day/week/month structures from the spec. Below `md`, week and month use a day strip plus chronological list; no horizontally crushed seven-column grid.

- [ ] **Step 4: Add the durable direction contract and surface brief**

The first child emitted by the professional root layout must keep the existing global direction contract. The Agenda page adds no duplicate root contract. Create the surface brief after implementation with:

```powershell
node C:\Users\MICRO\.agents\skills\impeccable\scripts\surface-brief.mjs read web/app/agenda/page.tsx
node C:\Users\MICRO\.agents\skills\impeccable\scripts\surface-brief.mjs write web/app/agenda/page.tsx .impeccable/agenda-surface-body.md
```

The body records Operate mode, calendar-dominant hierarchy, real-data requirement, responsive list fallback and no drag-and-drop.

- [ ] **Step 5: Run Green, lint and build gates**

Run:

```powershell
cd web
npm.cmd test -- app/agenda/page.test.tsx components/features/appointments/AppointmentCalendar.test.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit 0; postbuild direction contract passes.

- [ ] **Step 6: Run React and Impeccable mechanical reviews**

Read and apply `vercel:react-best-practices`, then run:

```powershell
node C:\Users\MICRO\.agents\skills\impeccable\scripts\detect.mjs --json web/app/agenda/page.tsx web/components/features/appointments
```

Fix every mechanical finding supported by the project constraints and rerun the focused tests once.

- [ ] **Step 7: Commit the professional calendar surface**

```powershell
git add -- web/app/agenda web/components/features/appointments web/lib/professional-workspace.ts .impeccable/surfaces/web-app-agenda-page-tsx.md
git commit -m "feat: build professional appointment calendar"
```

### Task 8: Real journey, visual evidence and final gates

**Files:**

- Create: `web/cypress/e2e/professional-agenda-real.cy.ts`
- Modify: `web/package.json`
- Modify: `docs/TASKS.md`
- Modify: `docs/agents/CODEX_STATUS.md`

**Interfaces:**

- Produces: verified end-to-end professional appointment journey.
- Consumes: complete API, PostgreSQL test database and built frontend.

- [ ] **Step 1: Write the Cypress journey before relying on the UI as complete**

The real spec must create a client through visible UI or deterministic test seed, then:

```ts
cy.findByRole('link', { name: 'Agenda' }).click();
cy.findByRole('button', { name: 'Novo atendimento' }).click();
cy.findByLabelText('Cliente').select('Cliente Agenda Real');
cy.findByLabelText('Data e hora inicial').type(nextBusinessDayAtTen);
cy.findByRole('button', { name: 'Salvar atendimento' }).click();
cy.findByText('Atendimento agendado com sucesso.').should('be.visible');
```

Continue through day/week/month, confirmation, reschedule, prontuário link, tenant isolation and mobile viewport. Inject axe and verify WCAG 2.2 AA tags on `/agenda`.

- [ ] **Step 2: Run the API and web full automated gates**

Run:

```powershell
cd api
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test -- --runInBand
npm.cmd run build

cd ..\web
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits 0 with no ignored TypeScript errors.

- [ ] **Step 3: Run the real Cypress journey twice**

Start the verified API, web and PostgreSQL test services using the repository's existing real-E2E workflow. Then run:

```powershell
cd web
npx.cmd cypress run --browser electron --spec cypress/e2e/professional-agenda-real.cy.ts
npx.cmd cypress run --browser electron --spec cypress/e2e/professional-agenda-real.cy.ts
```

Expected: both runs PASS, proving deterministic cleanup.

- [ ] **Step 4: Capture one final desktop/mobile visual round**

Capture only after the functional gates pass:

- `.impeccable/review/agenda-desktop.png` at 1440×900;
- `.impeccable/review/agenda-mobile.png` at 390×844.

Open both files once and verify they show the intended route, loaded data, no clipped controls and no duplicate navigation.

- [ ] **Step 5: Run the final design review**

Use the Impeccable finish reviewer with the approved spec, request, direction contract, craft-floor reference, detector result and both captures. Apply at most the bounded fix rounds required by its disposition.

- [ ] **Step 6: Update coordination files with the verified result**

Only after every required gate passes:

```markdown
| 2.12 | Agenda profissional de atendimentos vinculada a Client | ✅ | Codex |
```

Move the current task into the completed table in `CODEX_STATUS.md` and record any gate not executed as a limitation instead of calling the phase complete.

- [ ] **Step 7: Commit final verification artifacts and documentation**

```powershell
git add -- web/cypress/e2e/professional-agenda-real.cy.ts web/package.json docs/TASKS.md docs/agents/CODEX_STATUS.md .impeccable/review/agenda-desktop.png .impeccable/review/agenda-mobile.png
git commit -m "test: verify professional appointment journey"
```

- [ ] **Step 8: Finish the branch**

Invoke `superpowers:finishing-a-development-branch`, rerun its required verification command and present the integration options without merging or pushing unless the user selects one.
