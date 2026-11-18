import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { CLINICAL_RESPONSE } from '../../common/decorators/clinical-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../infra/database/prisma.service';
import { ExerciseLibraryService } from './exercise-library.service';
import { TrainingAnamnesesController } from './training-anamneses.controller';
import { TrainingAnamnesesService } from './training-anamneses.service';
import { TrainingReadService } from './training-read.service';
import { WorkoutDraftsService } from './workout-drafts.service';
import { WorkoutTemplatesService } from './workout-templates.service';
import { WorkoutsModule } from './workouts.module';
import { WorkoutsService } from './workouts.service';

const actor = {
  sub: '88000000-0000-4000-8000-000000000001',
  role: 'PERSONAL' as const,
};
const clientId = '88000000-0000-4000-8000-000000000011';
const recordId = '88000000-0000-4000-8000-000000000021';

const cleanParq = {
  heartCondition: false,
  chestPainActivity: false,
  chestPainRest: false,
  dizzinessOrSyncope: false,
  boneOrJointProblem: false,
  bloodPressureMedication: false,
  otherReason: false,
};

describe('TrainingAnamnesesService', () => {
  function setup() {
    const prisma = {
      trainingAnamnesis: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      client: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: clientId }]),
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    const access = {
      getOwnedClient: jest.fn().mockResolvedValue({ id: clientId }),
    };
    const service = new TrainingAnamnesesService(
      prisma as unknown as PrismaService,
      access as unknown as ClientAccessService,
    );
    return { prisma, access, service };
  }

  it('computes hasPositiveParq, deduplicates equipment, strips professionalId and enforces active client', async () => {
    const { prisma, service } = setup();
    const now = new Date('2026-11-06T14:00:00Z');
    prisma.client.findFirst.mockResolvedValue({ status: 'ACTIVE' });
    prisma.trainingAnamnesis.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: recordId,
        ...data,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const created = await service.create(actor, {
      clientId,
      parqAnswers: { ...cleanParq, boneOrJointProblem: true },
      medicalClearanceNotes: '  Liberado pelo ortopedista Dr. Carlos  ',
      musculoskeletalHistory: '  Condromalácia patelar grau II  ',
      trainingExperience: 'INTERMEDIATE',
      daysPerWeek: 4,
      maxSessionMinutes: 60,
      environment: 'CONDO_GYM',
      availableEquipment: ['DUMBBELL', 'CABLE', 'DUMBBELL', 'BODYWEIGHT'],
      notes: '  Prefere treinar pela manhã  ',
    });

    expect(created).toMatchObject({
      id: recordId,
      clientId,
      hasPositiveParq: true,
      medicalClearanceNotes: 'Liberado pelo ortopedista Dr. Carlos',
      musculoskeletalHistory: 'Condromalácia patelar grau II',
      trainingExperience: 'INTERMEDIATE',
      daysPerWeek: 4,
      maxSessionMinutes: 60,
      environment: 'CONDO_GYM',
      availableEquipment: ['DUMBBELL', 'CABLE', 'BODYWEIGHT'],
      notes: 'Prefere treinar pela manhã',
    });
    expect(created).not.toHaveProperty('professionalId');
  });

  it('rejects creating training anamnesis for an archived client with 409 CLIENT_ARCHIVED', async () => {
    const { prisma, service } = setup();
    prisma.client.findFirst.mockResolvedValue({ status: 'ARCHIVED' });
    await expect(
      service.create(actor, {
        clientId,
        parqAnswers: cleanParq,
        environment: 'HOME',
        availableEquipment: ['BODYWEIGHT'],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.trainingAnamnesis.create).not.toHaveBeenCalled();
  });

  it('blocks non-PERSONAL callers and foreign clients', async () => {
    const { access, service } = setup();
    await expect(
      service.listByClient({ ...actor, role: 'NUTRITIONIST' }, clientId),
    ).rejects.toMatchObject({ status: 403 });

    access.getOwnedClient.mockRejectedValue(
      new NotFoundException('Cliente não encontrado'),
    );
    await expect(service.listByClient(actor, clientId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: unknown }>();
    req.user = { sub: actor.sub, role: req.headers['x-role'] };
    return true;
  }
}

describe('TrainingAnamnesesController & Personal P4 Migration Contracts', () => {
  let app: INestApplication<App>;
  const anamnesisService = {
    listByClient: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: recordId, clientId }),
  };

  const controllers = Reflect.getMetadata(
    'controllers',
    WorkoutsModule,
  ) as Type<unknown>[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers,
      providers: [
        RolesGuard,
        { provide: TrainingAnamnesesService, useValue: anamnesisService },
        { provide: WorkoutDraftsService, useValue: {} },
        { provide: WorkoutTemplatesService, useValue: {} },
        { provide: WorkoutsService, useValue: {} },
        { provide: TrainingReadService, useValue: {} },
        { provide: ExerciseLibraryService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  it('routes /workouts/anamneses before :workoutId, enforces PERSONAL role and strict DTO whitelist', async () => {
    await request(app.getHttpServer())
      .get(`/workouts/anamneses/client/${clientId}`)
      .set('x-role', 'PERSONAL')
      .expect(200)
      .expect([]);

    for (const role of ['NUTRITIONIST', 'PHYSIO', 'ADMIN', 'PATIENT']) {
      await request(app.getHttpServer())
        .get(`/workouts/anamneses/client/${clientId}`)
        .set('x-role', role)
        .expect(403);
    }

    // Rejects injected professionalId or invalid PAR-Q / daysPerWeek
    for (const invalidBody of [
      {
        clientId,
        professionalId: actor.sub,
        parqAnswers: cleanParq,
        environment: 'FULL_GYM',
        availableEquipment: [],
      },
      {
        clientId,
        parqAnswers: { ...cleanParq, heartCondition: 'yes' },
        environment: 'FULL_GYM',
        availableEquipment: [],
      },
      {
        clientId,
        parqAnswers: cleanParq,
        daysPerWeek: 9,
        environment: 'FULL_GYM',
        availableEquipment: [],
      },
      {
        clientId,
        parqAnswers: cleanParq,
        environment: 'INVALID_ENV',
        availableEquipment: [],
      },
    ]) {
      await request(app.getHttpServer())
        .post('/workouts/anamneses')
        .set('x-role', 'PERSONAL')
        .send(invalidBody)
        .expect(400);
    }
    expect(anamnesisService.create).not.toHaveBeenCalled();

    // Classifies all handlers with @ClinicalResponse({ shape: 'resource' })
    const proto = TrainingAnamnesesController.prototype as unknown as Record<
      string,
      object
    >;
    expect(Reflect.getMetadata(CLINICAL_RESPONSE, proto.listByClient)).toEqual({
      shape: 'resource',
    });
    expect(Reflect.getMetadata(CLINICAL_RESPONSE, proto.create)).toEqual({
      shape: 'resource',
    });
  });

  it('enforces RLS, Data API denial and non-destructive UPDATE-only template grants in P4 migration', () => {
    const sql = readFileSync(
      resolve(
        __dirname,
        '../../../prisma/migrations/20261106150000_personal_p4/migration.sql',
      ),
      'utf8',
    );
    expect(sql).toContain(
      'ALTER TABLE public.training_anamneses ENABLE ROW LEVEL SECURITY;',
    );
    expect(sql).toContain(
      'CREATE POLICY deny_data_api_access ON public.training_anamneses AS RESTRICTIVE TO safemove_data_api_denied USING (false) WITH CHECK (false);',
    );
    expect(sql).toContain('safemove_private.owned_client("clientId")');
    expect(sql).toContain(
      'CREATE POLICY template_update ON public.workout_templates FOR UPDATE TO safemove_clinical',
    );
    expect(sql).toContain(
      'GRANT UPDATE ON public.workout_templates TO safemove_clinical;',
    );
    expect(sql).not.toMatch(
      /GRANT\s+DELETE\s+ON\s+(public\.)?workout_templates/i,
    );
  });
});
