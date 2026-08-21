# Fundação Profissional e Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fundação profissional-first com cadastro exclusivo de profissionais, prontuários `Client` privados, CRUD com arquivamento e isolamento comprovado entre contas.

**Architecture:** A mudança será aditiva: `User/PATIENT` e `/membros` permanecem temporariamente para compatibilidade, enquanto um novo módulo `/clients` e novas telas `/clientes` passam a representar prontuários sem autenticação. O navegador continuará autenticando por cookie HttpOnly; toda propriedade será derivada de `AuthUser.sub`, com um `ClientAccessService` central retornando `404` para recursos que não pertencem à conta.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query v5, Cypress 15, NestJS 11, Prisma 7, PostgreSQL, Jest 30 e Supertest.

**Spec:** `docs/superpowers/specs/2026-08-21-profissional-first-cliente-prontuario-design.md`

## Global Constraints

- Este plano implementa somente a **Fase 1 — Fundação profissional**.
- Não migrar dietas, treinos, reabilitações, avaliações, agenda, templates ou PDFs para `Client` nesta entrega.
- Manter `PATIENT`, `ProfessionalPatientLink`, `/membros` e `/paciente` enquanto consumidores legados existirem.
- Novos cadastros públicos aceitam exatamente `NUTRITIONIST`, `PERSONAL` ou `PHYSIO`; `role` é obrigatório e uma conta possui uma única atuação.
- `Client` não possui senha, papel, token ou login.
- Cada `Client` pertence a exatamente um `User` profissional individual.
- `professionalId` sempre vem de `AuthUser.sub`; DTOs rejeitam esse campo quando enviado pelo cliente HTTP.
- Recurso de outra conta retorna `404`, sem revelar sua existência.
- Clientes são arquivados ou restaurados; a API não oferece exclusão nesta fase.
- O navegador usa cookie HttpOnly com `withCredentials: true`; não introduzir token em `localStorage`.
- Manter o extrator Bearer apenas como compatibilidade para testes e ferramentas não-browser.
- No PowerShell do Windows, usar `npm.cmd` e `npx.cmd`.
- Baseline verificado em 2026-08-21: `prisma validate` passa; `web` `tsc --noEmit` passa; a API possui 7 suítes e 97 testes passando com o script oficial `npm.cmd test -- --runInBand`.

---

### Task 1: Adicionar o domínio persistente de clientes

**Files:**
- Modify: `api/prisma/schema.prisma:10-118`
- Create: `api/prisma/migrations/20260821190000_add_client_foundation/migration.sql`

**Interfaces:**
- Consumes: `User.id` como proprietário autenticável.
- Produces: `ClientStatus`, `ClientAuditAction`, `Client` e `ClientAuditEvent` no Prisma Client.

- [ ] **Step 1: Registrar o baseline antes da migration**

Run:

```powershell
cd api
npx.cmd prisma validate
npx.cmd prisma migrate status
```

Expected: schema válido. Se `migrate status` não responder por indisponibilidade do banco configurado, registrar essa condição e prosseguir somente com o banco de teste explícito no Step 5.

- [ ] **Step 2: Adicionar os modelos e relações ao schema**

Adicionar as relações a `User`:

```prisma
  ownedClients      Client[]           @relation("ProfessionalClients")
  clientAuditEvents ClientAuditEvent[] @relation("ProfessionalClientAuditEvents")
```

Adicionar os tipos abaixo ao schema:

```prisma
enum ClientStatus {
  ACTIVE
  ARCHIVED
}

enum ClientAuditAction {
  CREATED
  UPDATED
  ARCHIVED
  RESTORED
}

model Client {
  id             String       @id @default(uuid())
  professionalId String
  professional   User         @relation("ProfessionalClients", fields: [professionalId], references: [id], onDelete: Restrict)
  name           String
  email          String?
  phone          String?
  birthDate      DateTime?
  gender         String?
  goal           String?
  height         Float?
  initialWeight  Float?
  allergies      String?
  pathologies    String?
  typicalSleep   String?
  stressLevel    Int?
  foodRelationship String?
  psychologyHistory String?
  exerciseType      String?
  exerciseFrequency String?
  exerciseDuration  String?
  hasPersonal       String?
  workActivityLevel String?
  professionalNotes String? @db.Text
  privacyNotes      String? @db.Text
  status         ClientStatus @default(ACTIVE)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  auditEvents    ClientAuditEvent[]

  @@unique([professionalId, email])
  @@index([professionalId, status, createdAt])
  @@map("clients")
}

model ClientAuditEvent {
  id             String            @id @default(uuid())
  clientId       String
  client         Client            @relation(fields: [clientId], references: [id], onDelete: Restrict)
  professionalId String
  professional   User              @relation("ProfessionalClientAuditEvents", fields: [professionalId], references: [id], onDelete: Restrict)
  action         ClientAuditAction
  createdAt      DateTime          @default(now())

  @@index([professionalId, clientId, createdAt])
  @@map("client_audit_events")
}
```

- [ ] **Step 3: Criar a migration aditiva**

Run:

```powershell
cd api
npx.cmd prisma migrate dev --name add_client_foundation --create-only
```

Expected: migration cria somente enums, `clients`, `client_audit_events`, chaves e índices. Renomear a pasta gerada imediatamente para `20260821190000_add_client_foundation` e confirmar que ela contém um único `migration.sql` antes do commit.

- [ ] **Step 4: Validar e gerar o Prisma Client**

Run:

```powershell
cd api
npx.cmd prisma validate
npx.cmd prisma generate
```

Expected: ambos encerram com exit code `0`; `@prisma/client` passa a exportar os novos modelos e enums.

- [ ] **Step 5: Provar a reprodução das migrations em banco de teste vazio**

Run:

```powershell
cd api
$taskTestDb = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
if ($taskTestDb -notmatch '_test$') { throw 'Banco de teste inseguro.' }
$env:DIRECT_URL = $taskTestDb
$env:DATABASE_URL = $taskTestDb
npx.cmd prisma migrate reset --force --skip-seed
npx.cmd prisma migrate status
```

Expected: baseline, agenda e `add_client_foundation` são aplicadas; status informa banco atualizado. Nunca executar `migrate reset` sem a verificação `_test` acima.

- [ ] **Step 6: Commit**

```powershell
git add -- api/prisma/schema.prisma api/prisma/migrations/20260821190000_add_client_foundation/migration.sql
git commit -m "feat(api): add private client records"
```

---

### Task 2: Centralizar autorização de propriedade do cliente

**Files:**
- Create: `api/src/common/client-access/client-access.service.spec.ts`
- Create: `api/src/common/client-access/client-access.service.ts`
- Create: `api/src/common/client-access/client-access.module.ts`

**Interfaces:**
- Consumes: `AuthUser`, `CLINICAL_PROFESSIONAL_ROLES`, `PrismaService.client`.
- Produces: `ClientAccessService.getOwnedClient(user: AuthUser, clientId: string): Promise<Client>`.

- [ ] **Step 1: Escrever testes de propriedade e papel**

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessService', () => {
  const prisma = { client: { findFirst: jest.fn() } };
  let service: ClientAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientAccessService(prisma as never);
  });

  it('returns a client owned by the authenticated professional', async () => {
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
    await expect(
      service.getOwnedClient({ sub: 'pro-1', role: 'NUTRITIONIST' }, 'client-1'),
    ).resolves.toMatchObject({ id: 'client-1' });
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', professionalId: 'pro-1' },
    });
  });

  it('returns 404 for another professional client', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(
      service.getOwnedClient({ sub: 'pro-2', role: 'PERSONAL' }, 'client-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-clinical roles before querying', async () => {
    await expect(
      service.getOwnedClient({ sub: 'admin-1', role: 'ADMIN' }, 'client-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Executar o teste e confirmar falha**

Run:

```powershell
cd api
npm.cmd test -- client-access.service.spec.ts --runInBand
```

Expected: FAIL porque `ClientAccessService` ainda não existe.

- [ ] **Step 3: Implementar o serviço mínimo**

```typescript
@Injectable()
export class ClientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnedClient(user: AuthUser, clientId: string): Promise<Client> {
    if (!CLINICAL_PROFESSIONAL_ROLES.includes(user.role)) {
      throw new ForbiddenException('Acesso permitido somente a profissional clínico');
    }

    const client = await this.prisma.client.findFirst({
      where: { id: clientId, professionalId: user.sub },
    });

    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }
}
```

O módulo exporta `ClientAccessService` e importa `DatabaseModule`.

- [ ] **Step 4: Executar o teste e confirmar sucesso**

Run:

```powershell
cd api
npm.cmd test -- client-access.service.spec.ts --runInBand
```

Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/common/client-access
git commit -m "feat(api): enforce private client ownership"
```

---

### Task 3: Implementar serviço de clientes, DTOs e auditoria

**Files:**
- Create: `api/src/modules/clients/dto/client-optional-fields.dto.ts`
- Create: `api/src/modules/clients/dto/create-client.dto.ts`
- Create: `api/src/modules/clients/dto/update-client.dto.ts`
- Create: `api/src/modules/clients/dto/list-clients-query.dto.ts`
- Create: `api/src/modules/clients/dto/update-client-status.dto.ts`
- Create: `api/src/modules/clients/clients.service.spec.ts`
- Create: `api/src/modules/clients/clients.service.ts`

**Interfaces:**
- Consumes: `ClientAccessService.getOwnedClient`, `PrismaService.$transaction`, `AuthUser`.
- Produces:
  - `create(user: AuthUser, dto: CreateClientDto)`;
  - `findAll(user: AuthUser, status: ClientStatus)`;
  - `findOne(user: AuthUser, clientId: string)`;
  - `update(user: AuthUser, clientId: string, dto: UpdateClientDto)`;
  - `setStatus(user: AuthUser, clientId: string, status: ClientStatus)`.

- [ ] **Step 1: Definir DTOs sem campos de identidade ou autenticação**

Centralizar os campos clínicos opcionais em uma classe base sem identidade, autenticação, autoria ou status:

```typescript
// client-optional-fields.dto.ts
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ClientOptionalFieldsDto {
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  gender?: string | null;

  @IsOptional()
  @IsString()
  goal?: string | null;

  @IsOptional()
  @IsNumber()
  height?: number | null;

  @IsOptional()
  @IsNumber()
  initialWeight?: number | null;

  @IsOptional()
  @IsString()
  allergies?: string | null;

  @IsOptional()
  @IsString()
  pathologies?: string | null;

  @IsOptional()
  @IsString()
  typicalSleep?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stressLevel?: number | null;

  @IsOptional()
  @IsString()
  foodRelationship?: string | null;

  @IsOptional()
  @IsString()
  psychologyHistory?: string | null;

  @IsOptional()
  @IsString()
  exerciseType?: string | null;

  @IsOptional()
  @IsString()
  exerciseFrequency?: string | null;

  @IsOptional()
  @IsString()
  exerciseDuration?: string | null;

  @IsOptional()
  @IsBoolean()
  hasPersonal?: boolean | null;

  @IsOptional()
  @IsString()
  workActivityLevel?: string | null;

  @IsOptional()
  @IsString()
  professionalNotes?: string | null;

  @IsOptional()
  @IsString()
  privacyNotes?: string | null;
}
```

Definir criação e edição sobre essa classe, mantendo `name` obrigatório apenas na criação:

```typescript
// create-client.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ClientOptionalFieldsDto } from './client-optional-fields.dto';

export class CreateClientDto extends ClientOptionalFieldsDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

// update-client.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClientOptionalFieldsDto } from './client-optional-fields.dto';

export class UpdateClientDto extends ClientOptionalFieldsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
```

Definir `ListClientsQueryDto.status` com `@IsOptional()` e `@IsEnum(ClientStatus)`, usando `ClientStatus.ACTIVE` como padrão no controller quando ausente. Definir `UpdateClientStatusDto.status` como obrigatório com `@IsEnum(ClientStatus)`. Nenhum DTO aceita `professionalId`, `password` ou `role`.

- [ ] **Step 2: Escrever testes de criação, isolamento, conflito e arquivamento**

Usar transação simulada para provar autoria e auditoria:

```typescript
const tx = {
  client: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  clientAuditEvent: { create: jest.fn() },
};
const prisma = {
  client: { findMany: jest.fn() },
  $transaction: jest.fn((callback) => callback(tx)),
};
const access = { getOwnedClient: jest.fn() };

it('derives ownership and writes CREATED audit event', async () => {
  tx.client.create.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
  await service.create(
    { sub: 'pro-1', role: 'NUTRITIONIST' },
    { name: 'Ana', email: ' ANA@EXAMPLE.COM ' },
  );
  expect(tx.client.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      professionalId: 'pro-1',
      name: 'Ana',
      email: 'ana@example.com',
    }),
  });
  expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
    data: { clientId: 'client-1', professionalId: 'pro-1', action: 'CREATED' },
  });
});

it('lists only the authenticated professional active clients', async () => {
  prisma.client.findMany.mockResolvedValue([]);
  await service.findAll({ sub: 'pro-2', role: 'PERSONAL' }, 'ACTIVE');
  expect(prisma.client.findMany).toHaveBeenCalledWith({
    where: { professionalId: 'pro-2', status: 'ACTIVE' },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
  });
});

it('archives an owned client and writes ARCHIVED audit event', async () => {
  access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
  tx.client.update.mockResolvedValue({ id: 'client-1', status: 'ARCHIVED' });
  await service.setStatus(
    { sub: 'pro-1', role: 'PHYSIO' },
    'client-1',
    'ARCHIVED',
  );
  expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
    data: { clientId: 'client-1', professionalId: 'pro-1', action: 'ARCHIVED' },
  });
});
```

Adicionar o teste de conflito:

```typescript
it('returns 409 for a duplicate email inside the same professional account', async () => {
  tx.client.create.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError('duplicate client email', {
      code: 'P2002',
      clientVersion: '7.5.0',
      meta: { target: ['professionalId', 'email'] },
    }),
  );
  await expect(
    service.create(
      { sub: 'pro-1', role: 'NUTRITIONIST' },
      { name: 'Ana', email: 'ana@example.test' },
    ),
  ).rejects.toBeInstanceOf(ConflictException);
});
```

Provar também que a autorização acontece antes da escrita:

```typescript
it('checks ownership before updating a client', async () => {
  const user = { sub: 'pro-1', role: 'NUTRITIONIST' } as const;
  access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
  tx.client.update.mockResolvedValue({ id: 'client-1', name: 'Ana Maria' });

  await service.update(user, 'client-1', { name: 'Ana Maria' });

  expect(access.getOwnedClient).toHaveBeenCalledWith(user, 'client-1');
  expect(tx.client.update).toHaveBeenCalledWith({
    where: { id: 'client-1' },
    data: expect.objectContaining({ name: 'Ana Maria' }),
  });
  expect(access.getOwnedClient.mock.invocationCallOrder[0]).toBeLessThan(
    tx.client.update.mock.invocationCallOrder[0],
  );
});
```

- [ ] **Step 3: Executar os testes e confirmar falha**

Run:

```powershell
cd api
npm.cmd test -- clients.service.spec.ts --runInBand
```

Expected: FAIL porque o serviço ainda não existe.

- [ ] **Step 4: Implementar mapeamento explícito e transações**

Não usar spread direto do DTO no Prisma. Normalizar e-mail assim:

```typescript
const normalizeOptionalEmail = (email?: string): string | null => {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
};
```

Criar e auditar na mesma transação:

```typescript
return this.prisma.$transaction(async (tx) => {
  const client = await tx.client.create({
    data: {
      professionalId: user.sub,
      name: dto.name.trim(),
      email: normalizeOptionalEmail(dto.email),
      phone: dto.phone?.trim() || null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      gender: dto.gender?.trim() || null,
      goal: dto.goal?.trim() || null,
      height: dto.height ?? null,
      initialWeight: dto.initialWeight ?? null,
      allergies: dto.allergies?.trim() || null,
      pathologies: dto.pathologies?.trim() || null,
      typicalSleep: dto.typicalSleep?.trim() || null,
      stressLevel: dto.stressLevel ?? null,
      foodRelationship: dto.foodRelationship?.trim() || null,
      psychologyHistory: dto.psychologyHistory?.trim() || null,
      exerciseType: dto.exerciseType?.trim() || null,
      exerciseFrequency: dto.exerciseFrequency?.trim() || null,
      exerciseDuration: dto.exerciseDuration?.trim() || null,
      hasPersonal: dto.hasPersonal?.trim() || null,
      workActivityLevel: dto.workActivityLevel?.trim() || null,
      professionalNotes: dto.professionalNotes?.trim() || null,
      privacyNotes: dto.privacyNotes?.trim() || null,
    },
  });
  await tx.clientAuditEvent.create({
    data: { clientId: client.id, professionalId: user.sub, action: 'CREATED' },
  });
  return client;
});
```

Em `update`, distinguir campo omitido de campo enviado como `null`:

```typescript
const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const data = {
  name: hasOwn(dto, 'name') ? dto.name?.trim() : undefined,
  email: hasOwn(dto, 'email')
    ? normalizeOptionalEmail(dto.email ?? undefined)
    : undefined,
  height: hasOwn(dto, 'height') ? dto.height ?? null : undefined,
  professionalNotes: hasOwn(dto, 'professionalNotes')
    ? dto.professionalNotes?.trim() || null
    : undefined,
};
```

Aplicar o mesmo padrão a todos os campos atualizáveis. Em `setStatus`, mapear `ACTIVE` para `RESTORED` e `ARCHIVED` para `ARCHIVED`.

- [ ] **Step 5: Executar testes do módulo**

Run:

```powershell
cd api
npm.cmd test -- clients.service.spec.ts client-access.service.spec.ts --runInBand
```

Expected: PASS em todas as asserções novas.

- [ ] **Step 6: Commit**

```powershell
git add -- api/src/modules/clients/dto api/src/modules/clients/clients.service.ts api/src/modules/clients/clients.service.spec.ts
git commit -m "feat(api): add audited client lifecycle"
```

---

### Task 4: Expor a API `/clients` com validação HTTP

**Files:**
- Create: `api/src/modules/clients/clients.controller.spec.ts`
- Create: `api/src/modules/clients/clients.controller.ts`
- Create: `api/src/modules/clients/clients.module.ts`
- Modify: `api/src/app.module.ts:8-61`

**Interfaces:**
- Consumes: métodos de `ClientsService`, `JwtAuthGuard`, `RolesGuard`, `AuthUser`.
- Produces:
  - `POST /clients`;
  - `GET /clients?status=ACTIVE|ARCHIVED`;
  - `GET /clients/:id`;
  - `PATCH /clients/:id`;
  - `PATCH /clients/:id/status`.

- [ ] **Step 1: Escrever testes HTTP do controller**

Criar app Nest isolada com `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, serviço mockado e guards substituídos. O guard de teste injeta `{ sub: 'pro-1', role: 'NUTRITIONIST' }`.

```typescript
it('rejects professionalId in create body', () =>
  request(app.getHttpServer())
    .post('/clients')
    .send({ name: 'Ana', professionalId: 'pro-2' })
    .expect(400));

it('passes authenticated ownership to the service', async () => {
  clientsService.create.mockResolvedValue({ id: 'client-1', name: 'Ana' });
  await request(app.getHttpServer())
    .post('/clients')
    .send({ name: 'Ana' })
    .expect(201);
  expect(clientsService.create).toHaveBeenCalledWith(
    expect.objectContaining({ sub: 'pro-1', role: 'NUTRITIONIST' }),
    { name: 'Ana' },
  );
});

it('validates the status enum', () =>
  request(app.getHttpServer())
    .patch('/clients/client-1/status')
    .send({ status: 'DELETED' })
    .expect(400));
```

- [ ] **Step 2: Executar o teste e confirmar falha**

Run:

```powershell
cd api
npm.cmd test -- clients.controller.spec.ts --runInBand
```

Expected: FAIL porque controller e módulo ainda não existem.

- [ ] **Step 3: Implementar controller e módulo**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('NUTRITIONIST', 'PERSONAL', 'PHYSIO')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Request() request: { user: AuthUser }, @Body() dto: CreateClientDto) {
    return this.clientsService.create(request.user, dto);
  }

  @Get()
  findAll(
    @Request() request: { user: AuthUser },
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.findAll(request.user, query.status ?? 'ACTIVE');
  }

  @Get(':id')
  findOne(@Request() request: { user: AuthUser }, @Param('id') id: string) {
    return this.clientsService.findOne(request.user, id);
  }

  @Patch(':id')
  update(
    @Request() request: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(request.user, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @Request() request: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateClientStatusDto,
  ) {
    return this.clientsService.setStatus(request.user, id, dto.status);
  }
}
```

`ClientsModule` importa `DatabaseModule` e `ClientAccessModule`; registra controller e serviço. Importar `ClientsModule` em `AppModule` sem remover `UsersModule`.

- [ ] **Step 4: Executar testes do módulo**

Run:

```powershell
cd api
npm.cmd test -- clients --runInBand
```

Expected: service e controller passam.

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/modules/clients api/src/app.module.ts
git commit -m "feat(api): expose private clients api"
```

---

### Task 5: Restringir novos cadastros a uma única atuação profissional

**Files:**
- Create: `api/src/modules/auth/auth.controller.spec.ts`
- Create: `api/src/modules/auth/auth.service.spec.ts`
- Modify: `api/src/modules/auth/dto/register.dto.ts:10-38`
- Modify: `api/src/modules/auth/auth.service.ts:45-76`

**Interfaces:**
- Consumes: `POST /auth/register`, cookie `access_token`, `RegisterDto`.
- Produces: registro obrigatório com `NUTRITIONIST | PERSONAL | PHYSIO`; login continua retornando mensagem e cookie HttpOnly sem token no body.

- [ ] **Step 1: Escrever testes do contrato de registro**

```typescript
it.each(['PATIENT', 'ADMIN', undefined])('rejects non-professional role %s', async (role) => {
  const body = {
    name: 'Profissional',
    email: 'pro@example.test',
    password: '12345678',
    ...(role ? { role } : {}),
  };
  await request(app.getHttpServer()).post('/auth/register').send(body).expect(400);
});

it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'])('accepts %s', async (role) => {
  authService.register.mockResolvedValue({ id: 'pro-1', role });
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      name: 'Profissional',
      email: `${role.toLowerCase()}@example.test`,
      password: '12345678',
      role,
    })
    .expect(201);
});
```

No teste de serviço, assegurar que `role` é usado sem fallback:

```typescript
expect(prisma.user.create).toHaveBeenCalledWith({
  data: expect.objectContaining({ role: 'PHYSIO' }),
  select: expect.any(Object),
});
```

Adicionar o teste de caracterização que protege o contrato atual de login por cookie:

```typescript
it('sets the access token only in an HttpOnly cookie', async () => {
  authService.login.mockResolvedValue({ access_token: 'signed-token' });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'pro@example.test', password: '12345678' })
    .expect(200);

  expect(response.headers['set-cookie'][0]).toContain('access_token=signed-token');
  expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(response.body).toEqual({ message: 'Login realizado com sucesso' });
  expect(response.body).not.toHaveProperty('access_token');
});
```

- [ ] **Step 2: Executar e confirmar as falhas**

Run:

```powershell
cd api
npm.cmd test -- auth.controller.spec.ts auth.service.spec.ts --runInBand
```

Expected: falhas porque `PATIENT` ainda é aceito, `PHYSIO` não está no DTO e `role` ainda possui fallback.

- [ ] **Step 3: Corrigir o DTO e o serviço**

```typescript
export enum RegisterRole {
  NUTRITIONIST = 'NUTRITIONIST',
  PERSONAL = 'PERSONAL',
  PHYSIO = 'PHYSIO',
}

@IsEnum(RegisterRole, { message: 'Escolha Nutricionista, Personal ou Fisioterapeuta' })
role!: RegisterRole;
```

No `AuthService.register`, usar `role: registerDto.role` e remover o fallback `PATIENT`. Não alterar o fluxo de cookie já adotado pelo controller e frontend.

- [ ] **Step 4: Executar testes de auth e build da API**

Run:

```powershell
cd api
npm.cmd test -- auth.controller.spec.ts auth.service.spec.ts --runInBand
npm.cmd run build
```

Expected: testes novos e build passam.

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/modules/auth
git commit -m "feat(auth): register professionals only"
```

---

### Task 6: Provar isolamento e lifecycle em teste E2E da API

**Files:**
- Create: `api/test/clients.e2e-spec.ts`

**Interfaces:**
- Consumes: endpoints `/clients`, `AppModule`, `JwtAuthGuard`, banco de teste seguro.
- Produces: prova executável de criação, isolamento, edição, arquivamento, restauração e auditoria.

- [ ] **Step 1: Criar fixtures seguras de duas contas**

Reutilizar o padrão de `api/test/agenda.e2e-spec.ts`: URL exata de teste, guard por headers e verificação antes de limpar dados.

```typescript
const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';
const PROFESSIONAL_A = '20000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '20000000-0000-4000-8000-000000000002';

const asUser = (userId: string, role: Role) => ({
  'x-test-user-id': userId,
  'x-test-role': role,
});
```

Limpeza deve apagar `clientAuditEvent`, depois `client`, depois os usuários de fixture, sempre após confirmar `DIRECT_URL` e `DATABASE_URL` iguais à URL segura.

- [ ] **Step 2: Escrever a jornada E2E**

```typescript
it('keeps clients private and archives without deleting history', async () => {
  const created = await request(app.getHttpServer())
    .post('/clients')
    .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
    .send({ name: 'Cliente A', email: 'shared@example.test' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/clients')
    .set(asUser(PROFESSIONAL_B, 'PERSONAL'))
    .send({ name: 'Cliente B', email: 'shared@example.test' })
    .expect(201);

  await request(app.getHttpServer())
    .get(`/clients/${created.body.id}`)
    .set(asUser(PROFESSIONAL_B, 'PERSONAL'))
    .expect(404);

  await request(app.getHttpServer())
    .patch(`/clients/${created.body.id}`)
    .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
    .send({ professionalId: PROFESSIONAL_B })
    .expect(400);

  await request(app.getHttpServer())
    .patch(`/clients/${created.body.id}/status`)
    .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
    .send({ status: 'ARCHIVED' })
    .expect(200);

  expect(await prisma.clientAuditEvent.count({
    where: { clientId: created.body.id, action: 'ARCHIVED' },
  })).toBe(1);
});
```

Adicionar à mesma jornada estas requisições e asserções:

```typescript
await request(app.getHttpServer())
  .get('/clients')
  .query({ status: 'ACTIVE' })
  .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
  .expect(200)
  .expect(({ body }) => expect(body).toEqual([]));

await request(app.getHttpServer())
  .get('/clients')
  .query({ status: 'ARCHIVED' })
  .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
  .expect(200)
  .expect(({ body }) => expect(body).toEqual([
    expect.objectContaining({ id: created.body.id, status: 'ARCHIVED' }),
  ]));

await request(app.getHttpServer())
  .patch(`/clients/${created.body.id}`)
  .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
  .send({ name: 'Cliente A Atualizado' })
  .expect(200);

await request(app.getHttpServer())
  .patch(`/clients/${created.body.id}/status`)
  .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
  .send({ status: 'ACTIVE' })
  .expect(200)
  .expect(({ body }) => expect(body.status).toBe('ACTIVE'));
```

- [ ] **Step 3: Confirmar e aplicar migrations somente no banco de teste**

Run:

```powershell
cd api
$taskTestDb = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
if ($taskTestDb -notmatch '_test$') { throw 'Banco de teste inseguro.' }
$env:DIRECT_URL = $taskTestDb
$env:DATABASE_URL = $taskTestDb
npx.cmd prisma migrate deploy
```

Expected: migrations aplicadas ou banco já atualizado; nenhuma operação é executada fora da URL terminada em `_test`.

- [ ] **Step 4: Executar a jornada E2E**

```powershell
cd api
$taskTestDb = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
if ($taskTestDb -notmatch '_test$') { throw 'Banco de teste inseguro.' }
$env:DIRECT_URL = $taskTestDb
$env:DATABASE_URL = $taskTestDb
npm.cmd run test:e2e -- clients.e2e-spec.ts --runInBand
```

Expected: PASS; nenhuma fixture permanece após `afterAll`.

- [ ] **Step 5: Commit**

```powershell
git add -- api/test/clients.e2e-spec.ts
git commit -m "test(api): verify client tenant isolation"
```

---

### Task 7: Adaptar o cadastro e a sessão no frontend

**Files:**
- Create: `web/cypress/e2e/professional-registration.cy.ts`
- Create: `web/scripts/run-cypress-spec.ps1`
- Modify: `web/app/auth/register/page.tsx:13-100`
- Modify: `web/contexts/auth-context.tsx:24-31,72-90,94-98`

**Interfaces:**
- Consumes: `POST /auth/register`, `GET /auth/me` e cookie HttpOnly.
- Produces: seletor com três atuações, redirecionamento profissional temporário para `/clientes` e `run-cypress-spec.ps1 -Spec <paths>`.

- [ ] **Step 1: Escrever o teste Cypress de registro profissional**

```typescript
describe('Cadastro profissional', () => {
  it('oferece uma atuação obrigatória e nunca envia PATIENT', () => {
    cy.intercept('POST', '**/auth/register', (request) => {
      expect(request.body).to.deep.include({
        name: 'Dra. Ana',
        email: 'ana@example.test',
        role: 'PHYSIO',
      });
      expect(request.body.role).not.to.equal('PATIENT');
      request.reply({ statusCode: 201, body: { id: 'pro-1' } });
    }).as('register');

    cy.visit('http://localhost:3001/auth/register');
    cy.contains('Paciente / Aluno').should('not.exist');
    cy.contains('button', 'Fisioterapeuta').click();
    cy.get('input[name="name"]').type('Dra. Ana');
    cy.get('input[name="email"]').type('ana@example.test');
    cy.get('input[name="password"]').type('12345678');
    cy.contains('button', 'Criar conta').click();
    cy.wait('@register');
  });
});
```

Fixar os atributos dos três campos como `name="name"`, `name="email"` e `name="password"`. Os botões de atuação devem usar `type="button"`, e o submit final deve usar exatamente o texto `Criar conta`, que será o seletor estável do Cypress.

Criar o executor local que inicia e encerra o Next.js de forma segura:

```powershell
param(
  [Parameter(Mandatory = $true)]
  [string]$Spec
)

$webDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outFile = Join-Path $env:TEMP "safemove-cypress-$PID-out.log"
$errFile = Join-Path $env:TEMP "safemove-cypress-$PID-err.log"
$server = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'npm.cmd run dev' `
  -WorkingDirectory $webDir `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $outFile `
  -RedirectStandardError $errFile

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    Get-Content $outFile, $errFile -ErrorAction SilentlyContinue
    throw 'Servidor Next não ficou pronto em 90 segundos.'
  }

  Push-Location $webDir
  try {
    & '.\node_modules\.bin\cypress.cmd' run --spec $Spec --browser electron
    if ($LASTEXITCODE -ne 0) { throw "Cypress falhou com exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  if ($server -and -not $server.HasExited) {
    taskkill /PID $server.Id /T /F | Out-Null
  }
  Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
}
```

- [ ] **Step 2: Executar e confirmar falha**

Run:

```powershell
cd web
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/professional-registration.cy.ts
```

Expected: FAIL porque a opção Paciente ainda aparece e o papel inicial é `PATIENT`.

- [ ] **Step 3: Remover paciente e exigir uma atuação**

Usar estado tipado:

```typescript
type ProfessionalRole = 'NUTRITIONIST' | 'PERSONAL' | 'PHYSIO';

const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  phone: '',
  companyName: '',
  role: 'NUTRITIONIST' as ProfessionalRole,
});
```

O array `roles` contém somente Nutricionista, Personal Trainer e Fisioterapeuta. Remover `User` dos imports de ícones se ficar sem uso. Todos os inputs principais recebem `name` estável.

- [ ] **Step 4: Consolidar redirecionamento sem remover compatibilidade legada**

```typescript
const getRedirectPath = (role?: string) => {
  if (role === 'PATIENT') return '/paciente';
  if (['NUTRITIONIST', 'PERSONAL', 'PHYSIO'].includes(role ?? '')) {
    return '/clientes';
  }
  return '/auth/login';
};
```

Manter hidratação por `GET /auth/me`, `withCredentials` e logout no servidor. Não adicionar leitura ou escrita em `localStorage`.

- [ ] **Step 5: Executar TypeScript e o teste Cypress**

```powershell
cd web
npx.cmd tsc --noEmit
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/professional-registration.cy.ts
```

Expected: ambos passam.

- [ ] **Step 6: Commit**

```powershell
git add -- web/app/auth/register/page.tsx web/contexts/auth-context.tsx web/cypress/e2e/professional-registration.cy.ts web/scripts/run-cypress-spec.ps1
git commit -m "feat(web): onboard professionals by specialty"
```

---

### Task 8: Criar diretório e cadastro de clientes no frontend

**Files:**
- Create: `web/types/client.ts`
- Create: `web/hooks/features/useClients.ts`
- Create: `web/components/features/clients/ClientForm.tsx`
- Create: `web/app/clientes/page.tsx`
- Create: `web/app/clientes/novo/page.tsx`
- Create: `web/cypress/e2e/clients-create.cy.ts`
- Modify: `web/lib/query-keys.ts:1-12`

**Interfaces:**
- Consumes: `GET /clients?status=ACTIVE`, `POST /clients`, `useAuth`.
- Produces:
  - `Client`, `ClientStatus`, `ClientFormValues`;
  - `useClients(status: ClientStatus)`;
  - páginas `/clientes` e `/clientes/novo`.

- [ ] **Step 1: Definir contrato frontend**

```typescript
export type ClientStatus = 'ACTIVE' | 'ARCHIVED';

export interface Client {
  id: string;
  professionalId: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  goal: string | null;
  height: number | null;
  initialWeight: number | null;
  allergies: string | null;
  pathologies: string | null;
  typicalSleep: string | null;
  stressLevel: number | null;
  foodRelationship: string | null;
  psychologyHistory: string | null;
  exerciseType: string | null;
  exerciseFrequency: string | null;
  exerciseDuration: string | null;
  hasPersonal: string | null;
  workActivityLevel: string | null;
  professionalNotes: string | null;
  privacyNotes: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export type ClientFormValues = Omit<
  Client,
  'id' | 'professionalId' | 'status' | 'createdAt' | 'updatedAt'
>;
```

Adicionar query keys:

```typescript
clients: (sessionUserId: string, status: ClientStatus) =>
  ['clients', sessionUserId, status] as const,
client: (sessionUserId: string, clientId: string) =>
  ['client', sessionUserId, clientId] as const,
```

- [ ] **Step 2: Escrever a jornada Cypress de listagem e criação**

```typescript
cy.intercept('GET', '**/auth/me', {
  body: { sub: 'pro-1', role: 'NUTRITIONIST', name: 'Dra. Ana' },
});
cy.intercept('GET', '**/clients?status=ACTIVE', { body: [] }).as('listClients');
cy.intercept('POST', '**/clients', (request) => {
  expect(request.body).to.deep.include({
    name: 'Cliente Teste',
    email: 'cliente@example.test',
  });
  expect(request.body).not.to.have.property('password');
  expect(request.body).not.to.have.property('role');
  expect(request.body).not.to.have.property('professionalId');
  request.reply({ statusCode: 201, body: { id: 'client-1', ...request.body, status: 'ACTIVE' } });
}).as('createClient');

cy.visit('http://localhost:3001/clientes');
cy.contains('Nenhum cliente ativo').should('be.visible');
cy.contains('a', 'Novo cliente').click();
cy.get('[name="name"]').type('Cliente Teste');
cy.get('[name="email"]').type('cliente@example.test');
cy.contains('Senha').should('not.exist');
cy.contains('button', 'Salvar cliente').click();
cy.wait('@createClient');
```

- [ ] **Step 3: Executar e confirmar falha**

Run:

```powershell
cd web
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/clients-create.cy.ts
```

Expected: FAIL porque `/clientes` ainda não existe.

- [ ] **Step 4: Implementar hook e formulário compartilhado**

```typescript
export function useClients(status: ClientStatus) {
  const { user } = useAuth();
  const sessionUserId = user?.sub ?? 'anonymous';
  return useQuery({
    queryKey: queryKeys.clients(sessionUserId, status),
    queryFn: async () => (await api.get<Client[]>('/clients', { params: { status } })).data,
    enabled: Boolean(user?.sub),
  });
}
```

`ClientForm` usa estado controlado, não contém senha ou papel e converte campos numéricos vazios para `null` antes de chamar `onSubmit`. Expor:

```typescript
type ClientFormProps = {
  initialValues?: Partial<ClientFormValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: ClientFormValues) => Promise<void>;
};
```

- [ ] **Step 5: Implementar listagem ativa e criação**

`/clientes` mostra nome, e-mail, telefone, objetivo e ações. O vazio usa o texto `Nenhum cliente ativo`. `/clientes/novo` envia apenas campos de `ClientFormValues`:

```typescript
await api.post('/clients', values);
await queryClient.invalidateQueries({
  queryKey: queryKeys.clients(user.sub, 'ACTIVE'),
});
router.push('/clientes');
```

Usar textos **Cliente/Clientes** para todas as especialidades nesta nova área.

- [ ] **Step 6: Executar Cypress e TypeScript**

```powershell
cd web
npx.cmd tsc --noEmit
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/clients-create.cy.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- web/types/client.ts web/hooks/features/useClients.ts web/components/features/clients web/app/clientes web/lib/query-keys.ts web/cypress/e2e/clients-create.cy.ts
git commit -m "feat(web): add private client directory"
```

---

### Task 9: Implementar edição, arquivamento e navegação profissional

**Files:**
- Create: `web/app/clientes/[id]/page.tsx`
- Create: `web/cypress/e2e/clients-lifecycle.cy.ts`
- Modify: `web/app/clientes/page.tsx`
- Modify: `web/components/Sidebar.tsx:12-22`

**Interfaces:**
- Consumes: `GET /clients/:id`, `PATCH /clients/:id`, `PATCH /clients/:id/status`.
- Produces: edição de prontuário, filtros Ativos/Arquivados, arquivar/restaurar e menu `Clientes`.

- [ ] **Step 1: Escrever teste Cypress do lifecycle**

```typescript
it('edits, archives and restores a client without delete', () => {
  cy.intercept('GET', '**/auth/me', {
    body: { sub: 'pro-1', role: 'PERSONAL', name: 'Prof. Caio' },
  });
  cy.intercept('GET', '**/clients?status=ACTIVE', {
    body: [{ id: 'client-1', name: 'Ana', status: 'ACTIVE', email: null, phone: null }],
  }).as('activeClients');
  cy.intercept('GET', '**/clients/client-1', {
    body: { id: 'client-1', name: 'Ana', status: 'ACTIVE', email: null, phone: null },
  }).as('client');
  cy.intercept('PATCH', '**/clients/client-1', (request) => {
    expect(request.body).to.deep.include({ name: 'Ana Atualizada' });
    request.reply({ statusCode: 200, body: { id: 'client-1', ...request.body } });
  }).as('updateClient');
  cy.intercept('PATCH', '**/clients/client-1/status', (request) => {
    expect(request.body).to.deep.equal({ status: 'ARCHIVED' });
    request.reply({ statusCode: 200, body: { id: 'client-1', status: 'ARCHIVED' } });
  }).as('archiveClient');

  cy.visit('http://localhost:3001/clientes');
  cy.contains('a', 'Ana').click();
  cy.get('[name="name"]').clear().type('Ana Atualizada');
  cy.contains('button', 'Salvar alterações').click();
  cy.wait('@updateClient');
  cy.contains('button', 'Arquivar cliente').click();
  cy.contains('button', 'Confirmar arquivamento').click();
  cy.wait('@archiveClient');
  cy.contains('Excluir cliente').should('not.exist');
});
```

Adicionar segundo cenário que seleciona `Arquivados` e envia `{ status: 'ACTIVE' }` ao restaurar.

- [ ] **Step 2: Executar e confirmar falha**

```powershell
cd web
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/clients-lifecycle.cy.ts
```

Expected: FAIL porque detalhe e lifecycle ainda não existem.

- [ ] **Step 3: Implementar detalhe e atualização**

Carregar por query key própria:

```typescript
const clientQuery = useQuery({
  queryKey: queryKeys.client(user?.sub ?? 'anonymous', clientId),
  queryFn: async () => (await api.get<Client>(`/clients/${clientId}`)).data,
  enabled: Boolean(user?.sub && clientId),
});
```

Ao atualizar, invalidar detalhe e ambas as listas. Erros `404` mostram `Cliente não encontrado` sem voltar a tentar indefinidamente.

- [ ] **Step 4: Implementar arquivamento/restauração e filtros**

```typescript
await api.patch(`/clients/${clientId}/status`, { status: nextStatus });
await Promise.all([
  queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, 'ACTIVE') }),
  queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, 'ARCHIVED') }),
  queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, clientId) }),
]);
```

Não chamar `DELETE`. Exigir confirmação para arquivar; restauração pode ser ação direta com toast.

- [ ] **Step 5: Atualizar a navegação**

Substituir os dois itens `Meus Pacientes/Meus Alunos` por um único item:

```typescript
{ title: 'Clientes', icon: Users, href: '/clientes', roles: ['NUTRITIONIST', 'PERSONAL', 'PHYSIO'], mobileName: 'Clientes' }
```

Manter itens de especialidade e manter `/membros` acessível por links legados até a Fase 2.

- [ ] **Step 6: Executar testes da jornada**

```powershell
cd web
npx.cmd tsc --noEmit
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/clients-create.cy.ts,cypress/e2e/clients-lifecycle.cy.ts,cypress/e2e/professional-registration.cy.ts
```

Expected: três specs passam.

- [ ] **Step 7: Commit**

```powershell
git add -- web/app/clientes web/components/Sidebar.tsx web/cypress/e2e/clients-lifecycle.cy.ts
git commit -m "feat(web): manage client record lifecycle"
```

---

### Task 10: Validar a Fase 1 e documentar a transição

**Files:**
- Modify: `README.md:5-20,156-163,293-307`
- Modify: `docs/superpowers/specs/2026-08-21-profissional-first-cliente-prontuario-design.md:323-330`

**Interfaces:**
- Consumes: todos os artefatos das Tasks 1-9.
- Produces: baseline documentado e evidência final da Fase 1.

- [ ] **Step 1: Atualizar documentação sem declarar as fases futuras como prontas**

O README deve declarar:

```markdown
O SafeMove é uma ferramenta profissional-first para Nutricionistas, Personal Trainers e Fisioterapeutas. Na Fase 1, cada conta profissional possui uma base privada de prontuários `Client`; fluxos legados de paciente permanecem temporariamente apenas para compatibilidade durante a migração.
```

Marcar como concluídos somente cadastro profissional, `Client` privado, CRUD, arquivamento e isolamento. Manter planos versionados, templates novos, PDF e retirada do paciente como fases seguintes.

Na spec, corrigir a pontuação da lista de testes de unidade para manter todos os itens com ponto e vírgula antes do último item.

- [ ] **Step 2: Validar schema e migration em banco seguro**

```powershell
cd api
npx.cmd prisma validate
npx.cmd prisma generate
$taskTestDb = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
if ($taskTestDb -notmatch '_test$') { throw 'Banco de teste inseguro.' }
$env:DIRECT_URL = $taskTestDb
$env:DATABASE_URL = $taskTestDb
npx.cmd prisma migrate reset --force --skip-seed
npx.cmd prisma migrate status
```

Expected: schema válido e três migrations aplicadas no banco de teste.

- [ ] **Step 3: Executar testes focados e builds**

```powershell
cd api
npm.cmd test -- client-access.service.spec.ts clients.service.spec.ts clients.controller.spec.ts auth.controller.spec.ts auth.service.spec.ts --runInBand
npm.cmd run test:e2e -- clients.e2e-spec.ts --runInBand
npm.cmd run build
cd ..\web
npx.cmd tsc --noEmit
npm.cmd run build
```

Expected: todos passam.

- [ ] **Step 4: Executar Cypress da Fase 1**

Os testes frontend interceptam as respostas da API e usam o executor que inicia e encerra o Next.js:

```powershell
cd web
powershell.exe -ExecutionPolicy Bypass -File scripts/run-cypress-spec.ps1 -Spec cypress/e2e/professional-registration.cy.ts,cypress/e2e/clients-create.cy.ts,cypress/e2e/clients-lifecycle.cy.ts
```

Expected: três specs passam.

- [ ] **Step 5: Executar regressão completa**

```powershell
cd api
npm.cmd test -- --runInBand
cd ..\web
npx.cmd tsc --noEmit
```

Expected: 7 suítes e pelo menos os 97 testes do baseline passam, além das novas suítes. Qualquer falha bloqueia a conclusão.

- [ ] **Step 6: Verificar diff e commit final**

```powershell
git diff --check
git status --short
git add -- README.md docs/superpowers/specs/2026-08-21-profissional-first-cliente-prontuario-design.md
git commit -m "docs: record professional foundation phase"
```

Expected: somente documentação de transição no commit; código já foi commitado por tarefa.
