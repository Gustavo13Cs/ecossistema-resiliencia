import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { AnamnesesService } from './anamneses.service';

const dto = {
  clientId: 'client-1',
  clinicalHistory: 'Histórico de teste',
  bristolScale: 4,
  waterIntake: 2.5,
};
describe('AnamnesesService Client ownership', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'NUTRITIONIST' };
  const prisma = {
    client: { findFirst: jest.fn() },
    anamnesis: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findMany: jest.fn(),
    },
  };
  let service: {
    create(user: AuthUser, data: typeof dto): Promise<unknown>;
    findByClient(user: AuthUser, clientId: string): Promise<unknown>;
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AnamnesesService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AnamnesesService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({ id: dto.clientId });
  });
  it('creates an owned Client record with an authenticated author and no legacy identity', async () => {
    await service.create(user, dto);
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: dto.clientId, professionalId: user.sub },
    });
    const creation: unknown = prisma.anamnesis.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: { ...dto, creatorId: user.sub, patientId: null },
    });
  });
  it('denies unknown and foreign Clients before creating or listing', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.findByClient(user, dto.clientId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.anamnesis.create).not.toHaveBeenCalled();
    expect(prisma.anamnesis.findMany).not.toHaveBeenCalled();
  });
  it('lists only this creator and Client history', async () => {
    await service.findByClient(user, dto.clientId);
    expect(prisma.anamnesis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: dto.clientId, creatorId: user.sub },
      }),
    );
  });
  it.each(['ADMIN', 'PATIENT', 'PERSONAL', 'PHYSIO'] as const)(
    'denies %s without clinical access',
    async (role) => {
      await expect(
        service.create({ ...user, role }, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.findByClient({ ...user, role }, dto.clientId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.anamnesis.create).not.toHaveBeenCalled();
      expect(prisma.anamnesis.findMany).not.toHaveBeenCalled();
    },
  );
});
