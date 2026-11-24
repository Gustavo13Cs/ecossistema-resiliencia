import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { PhysioSessionEvolutionsService } from './physio-session-evolutions.service';

describe('PhysioSessionEvolutionsService', () => {
  const user: AuthUser = { sub: 'physio-1', role: 'PHYSIO' };
  const clientId = '11111111-1111-4111-8111-111111111111';
  const appointmentId = '22222222-2222-4222-8222-222222222222';
  const planId = '33333333-3333-4333-8333-333333333333';

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: clientId }]),
    client: { findFirst: jest.fn() },
    appointment: { findFirst: jest.fn() },
    rehabPlan: { findFirst: jest.fn() },
    physioSessionEvolution: {
      findFirst: jest.fn(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const prisma = {
    client: { findFirst: jest.fn() },
    appointment: { findFirst: jest.fn() },
    physioSessionEvolution: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };

  let service: PhysioSessionEvolutionsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhysioSessionEvolutionsService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PhysioSessionEvolutionsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({
      id: clientId,
      professionalId: user.sub,
    });
    tx.client.findFirst.mockResolvedValue({ status: 'ACTIVE' });
    tx.appointment.findFirst.mockResolvedValue({
      id: appointmentId,
      startsAt: new Date('2026-11-24T14:00:00.000Z'),
      status: 'COMPLETED',
    });
    tx.rehabPlan.findFirst.mockResolvedValue({ id: planId });
    tx.physioSessionEvolution.findFirst.mockResolvedValue(null);
    tx.physioSessionEvolution.create.mockResolvedValue({
      id: 'evo-1',
      clientId,
      patientResponse: 'Boa tolerância ao treino',
    });
  });

  it('creates an evolution linked to appointment and plan while normalizing procedures', async () => {
    await service.create(user, {
      clientId,
      appointmentId,
      rehabPlanId: planId,
      painBefore: 6,
      painAfter: 3,
      proceduresApplied: ['  TENS  ', '', 'TENS', 'Ponte'],
      patientResponse: '  Redução importante da dor pós-sessão  ',
      nextSteps: '  Progredir carga na próxima visita  ',
    });

    expect(tx.physioSessionEvolution.create).toHaveBeenCalledTimes(1);
    const creation: unknown =
      tx.physioSessionEvolution.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: {
        clientId,
        professionalId: user.sub,
        appointmentId,
        rehabPlanId: planId,
        painBefore: 6,
        painAfter: 3,
        proceduresApplied: ['TENS', 'Ponte'],
        patientResponse: 'Redução importante da dor pós-sessão',
        nextSteps: 'Progredir carga na próxima visita',
      },
    });
  });

  it('rejects duplicate evolution for the same appointment', async () => {
    tx.physioSessionEvolution.findFirst.mockResolvedValueOnce({ id: 'evo-0' });

    await expect(
      service.create(user, {
        clientId,
        appointmentId,
        patientResponse: 'Paciente estável',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.physioSessionEvolution.create).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'NO_SHOW'] as const)(
    'rejects linking evolution to %s appointment',
    async (status) => {
      tx.appointment.findFirst.mockResolvedValueOnce({
        id: appointmentId,
        startsAt: new Date('2026-11-24T14:00:00.000Z'),
        status,
      });

      await expect(
        service.create(user, {
          clientId,
          appointmentId,
          patientResponse: 'Tentativa inválida',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects writing evolutions on an archived Client', async () => {
    tx.client.findFirst.mockResolvedValueOnce({ status: 'ARCHIVED' });

    await expect(
      service.create(user, {
        clientId,
        patientResponse: 'Evolução bloqueada',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.physioSessionEvolution.create).not.toHaveBeenCalled();
  });

  it('rejects foreign Client before transaction', async () => {
    prisma.client.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create(user, {
        clientId,
        patientResponse: 'Paciente alheio',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates and deletes owned evolutions inside active client lock', async () => {
    prisma.physioSessionEvolution.findFirst.mockResolvedValue({
      id: 'evo-1',
      clientId,
    });
    tx.physioSessionEvolution.update.mockResolvedValue({
      id: 'evo-1',
      clientId,
      patientResponse: 'Atualizada',
    });
    tx.physioSessionEvolution.delete.mockResolvedValue({
      id: 'evo-1',
      clientId,
    });

    await service.update(user, 'evo-1', {
      painAfter: 2,
      patientResponse: '  Atualizada  ',
    });
    expect(tx.physioSessionEvolution.update).toHaveBeenCalled();

    await service.remove(user, 'evo-1');
    expect(tx.physioSessionEvolution.delete).toHaveBeenCalledWith({
      where: { id: 'evo-1', clientId, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
  });

  it.each(['ADMIN', 'PATIENT', 'NUTRITIONIST', 'PERSONAL'] as const)(
    'forbids %s from accessing physio evolutions',
    async (role) => {
      const denied: AuthUser = { sub: user.sub, role };
      await expect(
        service.listByClient(denied, clientId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.create(denied, { clientId, patientResponse: 'Teste' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});
