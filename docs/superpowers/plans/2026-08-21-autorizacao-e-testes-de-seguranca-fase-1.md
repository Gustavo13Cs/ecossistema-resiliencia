# Autorização e Testes de Segurança — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proteger todas as rotas de `metrics` com JWT, vínculo profissional-paciente e propriedade do paciente, comprovando as regras com testes unitários, HTTP e de frontend.

**Architecture:** O `PatientAccessService` centraliza a decisão de leitura de dados de um paciente. O `MetricsController` aplica autenticação, papéis e DTO; o `MetricsService` repete a decisão de autorização antes do Prisma e deriva do JWT o paciente de qualquer escrita pessoal.

**Tech Stack:** NestJS 11, Passport JWT, class-validator, Prisma 7, Jest 30, Supertest 7, Next.js 16, React 19 e Cypress 15.

**Spec:** `docs/superpowers/specs/2026-08-21-autorizacao-e-testes-de-seguranca-fase-1-design.md`

## Global Constraints

- Leitura profissional exige papel clínico e `ProfessionalPatientLink.isActive = true`.
- Escrita de check-in é exclusiva do paciente autenticado e usa `AuthUser.sub` como `patientId`.
- `ADMIN` não acessa métricas clínicas.
- `DailyTracking` é dado operacional nesta fase e não exige consentimento adicional.
- O body de `POST /metrics/checkin` aceita somente `type` e `itemName`; `patientId` deve produzir `400`.
- Negação de acesso ocorre antes de qualquer operação Prisma.
- Preservar `GET /metrics/consistency/:patientId` e `GET /metrics/today/:patientId`.
- Não adicionar dependências, tabelas ou migrations.
- Todo comportamento de produção novo segue RED, GREEN e refatoração.

---

### Task 1: Centralizar a autorização de leitura do paciente

**Files:**
- Modify: `api/src/common/patient-access/patient-access.service.ts`
- Modify: `api/src/common/patient-access/patient-access.service.spec.ts`

**Interfaces:**
- Consumes: `AuthUser`, `assertPatientSelf(user, patientId)` e `assertProfessionalLink(user, patientId)`.
- Produces: `assertCanReadPatient(user: AuthUser, patientId: string): Promise<void>` para os services clínicos.

- [ ] **Step 1: Escrever os testes RED do contrato unificado de leitura**

Adicionar ao `describe('PatientAccessService')`:

```typescript
it('allows a patient to read their own data', async () => {
  await expect(
    service.assertCanReadPatient(
      { sub: 'patient-1', role: 'PATIENT' },
      'patient-1',
    ),
  ).resolves.toBeUndefined();

  expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
});

it('rejects a patient reading another patient', async () => {
  await expect(
    service.assertCanReadPatient(
      { sub: 'patient-1', role: 'PATIENT' },
      'patient-2',
    ),
  ).rejects.toBeInstanceOf(ForbiddenException);

  expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
});

it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'] as const)(
  'allows a linked %s to read patient data',
  async (role) => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue({ id: 'link-1' });

    await expect(
      service.assertCanReadPatient(
        { sub: 'professional-1', role },
        'patient-1',
      ),
    ).resolves.toBeUndefined();
  },
);

it('rejects ADMIN from reading clinical patient data', async () => {
  await expect(
    service.assertCanReadPatient(
      { sub: 'admin-1', role: 'ADMIN' },
      'patient-1',
    ),
  ).rejects.toBeInstanceOf(ForbiddenException);

  expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha correta**

Run:

```powershell
npm.cmd test -- --runInBand common/patient-access/patient-access.service.spec.ts
```

Expected: FAIL porque `assertCanReadPatient` ainda não existe.

- [ ] **Step 3: Implementar a menor decisão unificada de leitura**

Adicionar a `PatientAccessService`:

```typescript
async assertCanReadPatient(user: AuthUser, patientId: string): Promise<void> {
  if (user.role === 'PATIENT') {
    this.assertPatientSelf(user, patientId);
    return;
  }

  await this.assertProfessionalLink(user, patientId);
}
```

Essa composição preserva a rejeição de `ADMIN` já existente em `assertProfessionalLink`.

- [ ] **Step 4: Executar o teste e confirmar GREEN**

Run:

```powershell
npm.cmd test -- --runInBand common/patient-access/patient-access.service.spec.ts
```

Expected: PASS em todos os testes do `PatientAccessService`.

- [ ] **Step 5: Commitar o contrato central**

```powershell
git add -- api/src/common/patient-access/patient-access.service.ts api/src/common/patient-access/patient-access.service.spec.ts
git commit -m "feat: centralizar leitura autorizada de pacientes"
```

### Task 2: Autorizar o `MetricsService` antes do Prisma

**Files:**
- Create: `api/src/modules/metrics/dto/create-metric-check-in.dto.ts`
- Create: `api/src/modules/metrics/metrics.service.spec.ts`
- Modify: `api/src/modules/metrics/metrics.service.ts`

**Interfaces:**
- Consumes: `PatientAccessService.assertCanReadPatient(user, patientId)` e `PatientAccessService.assertPatientSelf(user, patientId)`.
- Produces:
  - `registerCheckIn(user: AuthUser, dto: CreateMetricCheckInDto)`;
  - `getWeeklyConsistency(user: AuthUser, patientId: string)`;
  - `getTodayLogs(user: AuthUser, patientId: string)`;
  - `CreateMetricCheckInDto` com `type` e `itemName`.

- [ ] **Step 1: Escrever os testes RED do service**

Criar `metrics.service.spec.ts` com Prisma e vínculo simulados, usando o `PatientAccessService` real:

```typescript
import { ForbiddenException } from '@nestjs/common';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { MetricsService } from './metrics.service';

describe('MetricsService authorization', () => {
  const prisma = {
    professionalPatientLink: { findFirst: jest.fn() },
    dailyTracking: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: MetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.dailyTracking.findMany.mockResolvedValue([]);
    service = new MetricsService(
      prisma as never,
      new PatientAccessService(prisma as never),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a check-in with the authenticated patient id', async () => {
    prisma.dailyTracking.create.mockResolvedValue({ id: 'tracking-1' });

    await service.registerCheckIn(
      { sub: 'patient-1', role: 'PATIENT' },
      { type: 'MEAL', itemName: 'Café da manhã' },
    );

    expect(prisma.dailyTracking.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        type: 'MEAL',
        itemName: 'Café da manhã',
      },
    });
  });

  it('rejects a professional creating a patient check-in', async () => {
    await expect(
      service.registerCheckIn(
        { sub: 'professional-1', role: 'NUTRITIONIST' },
        { type: 'MEAL', itemName: 'Almoço' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.dailyTracking.create).not.toHaveBeenCalled();
  });

  it('rejects another patient before reading consistency', async () => {
    await expect(
      service.getWeeklyConsistency(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-2',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('allows a linked professional to read today logs', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue({ id: 'link-1' });

    await service.getTodayLogs(
      { sub: 'professional-1', role: 'PHYSIO' },
      'patient-1',
    );

    expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: 'professional-1',
        patientId: 'patient-1',
        isActive: true,
      },
    });
    expect(prisma.dailyTracking.findMany).toHaveBeenCalled();
  });

  it('rejects ADMIN before reading metrics', async () => {
    await expect(
      service.getTodayLogs(
        { sub: 'admin-1', role: 'ADMIN' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('preserves the weekly consistency calculation', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-21T12:00:00.000Z'));
    const history = [
      { completedAt: new Date('2026-08-20T08:00:00.000Z') },
      { completedAt: new Date('2026-08-20T12:00:00.000Z') },
      { completedAt: new Date('2026-08-19T09:00:00.000Z') },
    ];
    prisma.dailyTracking.findMany.mockResolvedValue(history);

    await expect(
      service.getWeeklyConsistency(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
      ),
    ).resolves.toEqual({
      percentage: 29,
      activeDays: 2,
      totalLogs: 3,
      history,
    });

    expect(prisma.dailyTracking.findMany).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        completedAt: { gte: new Date('2026-08-14T12:00:00.000Z') },
      },
      orderBy: { completedAt: 'desc' },
    });
  });
});
```

- [ ] **Step 2: Executar o teste e confirmar RED**

Run:

```powershell
npm.cmd test -- --runInBand modules/metrics/metrics.service.spec.ts
```

Expected: FAIL porque o construtor e as assinaturas atuais não recebem `PatientAccessService` nem `AuthUser`.

- [ ] **Step 3: Criar o DTO e implementar autorização e identidade no service**

Criar `create-metric-check-in.dto.ts`:

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMetricCheckInDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemName!: string;
}
```

Substituir `metrics.service.ts` por:

```typescript
import { Injectable } from '@nestjs/common';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateMetricCheckInDto } from './dto/create-metric-check-in.dto';

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
  ) {}

  async registerCheckIn(user: AuthUser, dto: CreateMetricCheckInDto) {
    this.patientAccess.assertPatientSelf(user, user.sub);

    return this.prisma.dailyTracking.create({
      data: {
        patientId: user.sub,
        type: dto.type,
        itemName: dto.itemName,
      },
    });
  }

  async getWeeklyConsistency(user: AuthUser, patientId: string) {
    await this.patientAccess.assertCanReadPatient(user, patientId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const trackings = await this.prisma.dailyTracking.findMany({
      where: {
        patientId,
        completedAt: { gte: sevenDaysAgo },
      },
      orderBy: { completedAt: 'desc' },
    });
    const activeDays = new Set(
      trackings.map((tracking) =>
        tracking.completedAt.toISOString().split('T')[0],
      ),
    ).size;

    return {
      percentage: Math.round((activeDays / 7) * 100),
      activeDays,
      totalLogs: trackings.length,
      history: trackings,
    };
  }

  async getTodayLogs(user: AuthUser, patientId: string) {
    await this.patientAccess.assertCanReadPatient(user, patientId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.dailyTracking.findMany({
      where: {
        patientId,
        completedAt: { gte: today },
      },
    });
  }
}
```

- [ ] **Step 4: Executar os testes do service e do acesso central**

Run:

```powershell
npm.cmd test -- --runInBand modules/metrics/metrics.service.spec.ts common/patient-access/patient-access.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commitar a autorização do service**

```powershell
git add -- api/src/modules/metrics/dto/create-metric-check-in.dto.ts api/src/modules/metrics/metrics.service.ts api/src/modules/metrics/metrics.service.spec.ts
git commit -m "feat: autorizar operações de métricas"
```

### Task 3: Proteger o controller e comprovar a barreira HTTP

**Files:**
- Modify: `api/src/modules/metrics/metrics.controller.ts`
- Modify: `api/src/modules/metrics/metrics.module.ts`
- Create: `api/test/metrics-security.e2e-spec.ts`

**Interfaces:**
- Consumes: assinaturas protegidas do `MetricsService`, `JwtAuthGuard`, `RolesGuard`, `Roles` e `CLINICAL_PROFESSIONAL_ROLES`.
- Produces: rotas HTTP autenticadas com a mesma URL pública e payload de criação sem `patientId`.

- [ ] **Step 1: Criar a aplicação HTTP de teste com JWT real**

Criar `metrics-security.e2e-spec.ts` com estes elementos:

```typescript
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../src/common/strategies/jwt.strategy';
import { PatientAccessService } from '../src/common/patient-access/patient-access.service';
import { PrismaService } from '../src/infra/database/prisma.service';
import { MetricsController } from '../src/modules/metrics/metrics.controller';
import { MetricsService } from '../src/modules/metrics/metrics.service';

const TEST_SECRET = 'metrics-security-test-secret-at-least-32-chars';
const PATIENT_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_PATIENT_ID = '10000000-0000-4000-8000-000000000002';
const PROFESSIONAL_ID = '10000000-0000-4000-8000-000000000003';
const ADMIN_ID = '10000000-0000-4000-8000-000000000004';

describe('Metrics authorization (e2e)', () => {
  const prisma = {
    professionalPatientLink: { findFirst: jest.fn() },
    dailyTracking: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let app: INestApplication;
  let jwt: JwtService;
  const originalSecret = process.env.JWT_SECRET;

  const bearer = (sub: string, role: Role) => ({
    Authorization: `Bearer ${jwt.sign({
      sub,
      role,
      email: `${sub}@test.local`,
      name: 'Test User',
    })}`,
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    const moduleFixture = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: TEST_SECRET }),
      ],
      controllers: [MetricsController],
      providers: [
        JwtStrategy,
        MetricsService,
        PatientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    jwt = moduleFixture.get(JwtService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.dailyTracking.findMany.mockResolvedValue([]);
    prisma.dailyTracking.create.mockResolvedValue({ id: 'tracking-1' });
  });

  afterAll(async () => {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  // Os testes HTTP abaixo ficam neste describe.
});
```

- [ ] **Step 2: Adicionar os testes HTTP RED de autenticação, papéis e payload**

Adicionar ao arquivo:

```typescript
it('returns 401 without a JWT', async () => {
  await request(app.getHttpServer())
    .get(`/metrics/today/${PATIENT_ID}`)
    .expect(401);
});

it('returns 401 with an invalid JWT', async () => {
  await request(app.getHttpServer())
    .get(`/metrics/today/${PATIENT_ID}`)
    .set({ Authorization: 'Bearer invalid-token' })
    .expect(401);
});

it('rejects patientId in the check-in body', async () => {
  await request(app.getHttpServer())
    .post('/metrics/checkin')
    .set(bearer(PATIENT_ID, 'PATIENT'))
    .send({ patientId: OTHER_PATIENT_ID, type: 'MEAL', itemName: 'Almoço' })
    .expect(400);

  expect(prisma.dailyTracking.create).not.toHaveBeenCalled();
});

it('creates a check-in for the JWT patient', async () => {
  await request(app.getHttpServer())
    .post('/metrics/checkin')
    .set(bearer(PATIENT_ID, 'PATIENT'))
    .send({ type: 'MEAL', itemName: 'Almoço' })
    .expect(201);

  expect(prisma.dailyTracking.create).toHaveBeenCalledWith({
    data: { patientId: PATIENT_ID, type: 'MEAL', itemName: 'Almoço' },
  });
});

it('rejects a patient reading another patient', async () => {
  await request(app.getHttpServer())
    .get(`/metrics/today/${OTHER_PATIENT_ID}`)
    .set(bearer(PATIENT_ID, 'PATIENT'))
    .expect(403);

  expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
});

it('allows a linked professional to read metrics', async () => {
  prisma.professionalPatientLink.findFirst.mockResolvedValue({ id: 'link-1' });

  await request(app.getHttpServer())
    .get(`/metrics/consistency/${PATIENT_ID}`)
    .set(bearer(PROFESSIONAL_ID, 'NUTRITIONIST'))
    .expect(200);
});

it('rejects a professional without an active link', async () => {
  prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

  await request(app.getHttpServer())
    .get(`/metrics/today/${PATIENT_ID}`)
    .set(bearer(PROFESSIONAL_ID, 'PHYSIO'))
    .expect(403);

  expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
});

it('rejects professional writes and ADMIN reads', async () => {
  await request(app.getHttpServer())
    .post('/metrics/checkin')
    .set(bearer(PROFESSIONAL_ID, 'PERSONAL'))
    .send({ type: 'WORKOUT', itemName: 'Treino A' })
    .expect(403);

  await request(app.getHttpServer())
    .get(`/metrics/today/${PATIENT_ID}`)
    .set(bearer(ADMIN_ID, 'ADMIN'))
    .expect(403);

  expect(prisma.dailyTracking.create).not.toHaveBeenCalled();
  expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Executar o teste HTTP e confirmar RED**

Run:

```powershell
npm.cmd run test:e2e -- --runInBand metrics-security.e2e-spec.ts
```

Expected: FAIL porque o controller atual não possui guards, papéis, DTO ou usuário autenticado.

- [ ] **Step 4: Proteger o controller com papéis e usuário tipado**

Substituir `metrics.controller.ts` por:

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthUser,
  CLINICAL_PROFESSIONAL_ROLES,
} from '../../common/types/auth-user';
import { CreateMetricCheckInDto } from './dto/create-metric-check-in.dto';
import { MetricsService } from './metrics.service';

type AuthenticatedRequest = { user: AuthUser };

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('checkin')
  @Roles('PATIENT')
  createCheckIn(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateMetricCheckInDto,
  ) {
    return this.metricsService.registerCheckIn(request.user, dto);
  }

  @Get('consistency/:patientId')
  @Roles('PATIENT', ...CLINICAL_PROFESSIONAL_ROLES)
  getConsistency(
    @Request() request: AuthenticatedRequest,
    @Param('patientId') patientId: string,
  ) {
    return this.metricsService.getWeeklyConsistency(request.user, patientId);
  }

  @Get('today/:patientId')
  @Roles('PATIENT', ...CLINICAL_PROFESSIONAL_ROLES)
  getTodayCheckIns(
    @Request() request: AuthenticatedRequest,
    @Param('patientId') patientId: string,
  ) {
    return this.metricsService.getTodayLogs(request.user, patientId);
  }
}
```

- [ ] **Step 5: Importar `PatientAccessModule` no módulo de métricas**

Alterar `MetricsModule` para:

```typescript
import { Module } from '@nestjs/common';
import { PatientAccessModule } from '../../common/patient-access/patient-access.module';
import { DatabaseModule } from '../../infra/database/database.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [DatabaseModule, PatientAccessModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
```

- [ ] **Step 6: Executar testes HTTP e unitários**

Run:

```powershell
npm.cmd run test:e2e -- --runInBand metrics-security.e2e-spec.ts
npm.cmd test -- --runInBand modules/metrics/metrics.service.spec.ts common/patient-access/patient-access.service.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commitar a barreira HTTP**

```powershell
git add -- api/src/modules/metrics/metrics.controller.ts api/src/modules/metrics/metrics.module.ts api/test/metrics-security.e2e-spec.ts
git commit -m "test: cobrir segurança HTTP de métricas"
```

### Task 4: Remover `patientId` do payload do frontend

**Files:**
- Create: `web/cypress/e2e/metrics-checkin-security.cy.ts`
- Modify: `web/hooks/features/useCheckIn.ts`

**Interfaces:**
- Consumes: `POST /metrics/checkin` com `{ type, itemName }`.
- Produces: o hook continua recebendo `patientId` para as URLs de leitura, mas não o envia na escrita.

- [ ] **Step 1: Criar o teste Cypress RED do payload**

Criar `metrics-checkin-security.cy.ts`:

```typescript
describe('Payload seguro do check-in de métricas', () => {
  it('não envia patientId ao marcar uma refeição como feita', () => {
    cy.intercept('GET', '**/auth/me', {
      body: { sub: 'patient-e2e', role: 'PATIENT', name: 'Paciente Teste' },
    });
    cy.intercept('GET', '**/diet-plans/user/patient-e2e/active', {
      body: {
        id: 'diet-1',
        title: 'Plano E2E',
        goal: 'Saúde',
        meals: [{
          id: 'meal-1',
          name: 'Café da manhã',
          time: '08:00',
          items: [],
        }],
      },
    });
    cy.intercept('GET', '**/metrics/today/patient-e2e', { body: [] });
    cy.intercept('GET', '**/metrics/consistency/patient-e2e', {
      body: { percentage: 0, activeDays: 0, totalLogs: 0, history: [] },
    });
    cy.intercept('GET', '**/supplements/user/patient-e2e/active', { body: null });
    cy.intercept('POST', '**/metrics/checkin', (request) => {
      expect(request.body).to.deep.equal({
        type: 'MEAL',
        itemName: 'Café da manhã',
      });
      request.reply({ statusCode: 201, body: { id: 'tracking-1' } });
    }).as('metricCheckIn');

    cy.visit('http://localhost:3001/paciente');
    cy.contains('button', 'Marcar como Feito').click();
    cy.wait('@metricCheckIn');
  });
});
```

- [ ] **Step 2: Executar o Cypress e confirmar RED**

Run, com o servidor web iniciado na porta 3001:

```powershell
npx.cmd cypress run --spec cypress/e2e/metrics-checkin-security.cy.ts --browser electron
```

Expected: FAIL mostrando que o body atual também contém `patientId`.

- [ ] **Step 3: Remover `patientId` somente do POST**

Alterar no `handleCheckIn`:

```typescript
await api.post('/metrics/checkin', { type, itemName })
```

Manter `patientId` nas duas URLs GET, pois o backend autoriza o parâmetro e o frontend ainda depende dessas rotas.

- [ ] **Step 4: Executar novamente o Cypress**

Run:

```powershell
npx.cmd cypress run --spec cypress/e2e/metrics-checkin-security.cy.ts --browser electron
```

Expected: PASS.

- [ ] **Step 5: Commitar a compatibilidade do frontend**

```powershell
git add -- web/hooks/features/useCheckIn.ts web/cypress/e2e/metrics-checkin-security.cy.ts
git commit -m "fix: derivar paciente do token no check-in"
```

### Task 5: Verificação completa e handoff

**Files:**
- Verify: todos os arquivos alterados nas Tasks 1–4.

**Interfaces:**
- Consumes: contrato HTTP protegido e testes das tarefas anteriores.
- Produces: evidência final de testes, build, lint focalizado e diff limpo.

- [ ] **Step 1: Executar toda a suíte unitária da API**

```powershell
npm.cmd test -- --runInBand
```

Expected: todas as suítes unitárias PASS.

- [ ] **Step 2: Executar o teste HTTP de segurança**

```powershell
npm.cmd run test:e2e -- --runInBand metrics-security.e2e-spec.ts
```

Expected: PASS sem banco externo.

- [ ] **Step 3: Executar build e lint focalizado da API**

```powershell
npm.cmd run build
npx.cmd eslint "src/common/patient-access/*.ts" "src/modules/metrics/**/*.ts" "test/metrics-security.e2e-spec.ts"
```

Expected: build PASS e nenhum erro nos arquivos da fase.

- [ ] **Step 4: Verificar o frontend**

```powershell
npx.cmd tsc --noEmit
npx.cmd cypress run --spec cypress/e2e/metrics-checkin-security.cy.ts --browser electron
npm.cmd run build
```

Expected: TypeScript, Cypress e build PASS. O servidor Next deve estar disponível na porta 3001 durante o Cypress.

- [ ] **Step 5: Verificar integridade do diff**

```powershell
git diff --check
git status --short --branch
```

Expected: nenhum erro de whitespace e somente alterações/commits pertencentes à Fase 1.

- [ ] **Step 6: Revisar os critérios de aceite**

Confirmar explicitamente no handoff:

```text
[ ] Todas as rotas de metrics exigem JWT.
[ ] Paciente não cria nem lê métricas de outro paciente.
[ ] patientId no body é rejeitado.
[ ] Profissional vinculado lê e profissional sem vínculo não lê.
[ ] ADMIN não acessa métricas.
[ ] Negação não chama Prisma.
[ ] Cálculo de consistência foi preservado.
[ ] Nenhuma dependência ou migration foi adicionada.
```
