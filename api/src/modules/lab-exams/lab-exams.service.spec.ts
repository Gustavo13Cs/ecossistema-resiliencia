import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { LabExamsService } from './lab-exams.service';

const dto = {
  clientId: 'client-1',
  date: '2026-09-30',
  markers: [{ name: 'Glicemia', value: 90, unit: 'mg/dL' }],
};
describe('LabExamsService Client ownership', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'NUTRITIONIST' };
  const prisma = {
    client: { findFirst: jest.fn() },
    labExam: {
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
        LabExamsService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LabExamsService);
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
    const creation: unknown = prisma.labExam.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: {
        clientId: dto.clientId,
        date: new Date(dto.date),
        markers: { create: dto.markers },
        creatorId: user.sub,
        patientId: null,
      },
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
    expect(prisma.labExam.create).not.toHaveBeenCalled();
    expect(prisma.labExam.findMany).not.toHaveBeenCalled();
  });
  it('lists only this creator and Client history', async () => {
    await service.findByClient(user, dto.clientId);
    expect(prisma.labExam.findMany).toHaveBeenCalledWith(
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
      expect(prisma.labExam.create).not.toHaveBeenCalled();
      expect(prisma.labExam.findMany).not.toHaveBeenCalled();
    },
  );
});
