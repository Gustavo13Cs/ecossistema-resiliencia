import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { PhysioFunctionalScalesService } from './physio-functional-scales.service';

describe('PhysioFunctionalScalesService', () => {
  const user: AuthUser = { sub: 'physio-1', role: 'PHYSIO' };
  const clientId = '11111111-1111-4111-8111-111111111111';

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: clientId }]),
    client: { findFirst: jest.fn() },
    physioFunctionalScale: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      delete: jest.fn(),
    },
  };

  const prisma = {
    client: { findFirst: jest.fn() },
    physioFunctionalScale: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };

  let service: PhysioFunctionalScalesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhysioFunctionalScalesService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PhysioFunctionalScalesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({
      id: clientId,
      professionalId: user.sub,
    });
    tx.client.findFirst.mockResolvedValue({ status: 'ACTIVE' });
    tx.physioFunctionalScale.create.mockResolvedValue({
      id: 'scale-1',
      clientId,
    });
  });

  it('persists calculated score and classification inside active client lock', async () => {
    await service.create(user, {
      clientId,
      scaleType: 'TUG',
      answers: { timeSeconds: 9.4, assistiveDevice: 'NONE' },
      notes: '  Sem apoio  ',
    });

    expect(tx.physioFunctionalScale.create).toHaveBeenCalledTimes(1);
    const callArg: unknown = tx.physioFunctionalScale.create.mock.calls[0]?.[0];
    expect(callArg).toMatchObject({
      data: {
        clientId,
        professionalId: user.sub,
        scaleType: 'TUG',
        rawScore: 9.4,
        normalizedScore: 9.4,
        scoreUnit: 's',
        classification: 'Mobilidade normal e independente',
        notes: 'Sem apoio',
      },
    });
  });

  it('rejects archived Client when creating or removing scales', async () => {
    tx.client.findFirst.mockResolvedValueOnce({ status: 'ARCHIVED' });
    await expect(
      service.create(user, {
        clientId,
        scaleType: 'PSFS',
        answers: { activities: [{ description: 'Caminhar', score: 7 }] },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.physioFunctionalScale.create).not.toHaveBeenCalled();

    prisma.physioFunctionalScale.findFirst.mockResolvedValueOnce({
      id: 'scale-1',
      clientId,
    });
    tx.client.findFirst.mockResolvedValueOnce({ status: 'ARCHIVED' });
    await expect(service.remove(user, 'scale-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('denies foreign clients and non-PHYSIO roles', async () => {
    prisma.client.findFirst.mockResolvedValueOnce(null);
    await expect(service.listByClient(user, clientId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      service.listByClient({ sub: user.sub, role: 'PERSONAL' }, clientId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
