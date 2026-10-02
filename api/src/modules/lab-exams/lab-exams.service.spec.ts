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
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  let service: {
    create(user: AuthUser, data: typeof dto): Promise<unknown>;
    findByClient(user: AuthUser, clientId: string): Promise<unknown>;
    findAll(user: AuthUser): Promise<unknown>;
    remove(user: AuthUser, id: string): Promise<unknown>;
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
    prisma.labExam.findFirst.mockResolvedValue({ clientId: dto.clientId });
    prisma.labExam.deleteMany.mockResolvedValue({ count: 1 });
  });
  it('lists only records with this author and owned Client relation', async () => {
    await service.findAll(user);
    expect(prisma.labExam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId: user.sub, client: { professionalId: user.sub } },
        include: {
          markers: true,
          client: { select: { id: true, name: true } },
        },
      }),
    );
  });
  it('deletes an owned exam after author-scoped routing metadata and Client access', async () => {
    await service.remove(user, 'exam-1');
    expect(prisma.labExam.findFirst).toHaveBeenCalledWith({
      where: { id: 'exam-1', creatorId: user.sub },
      select: { clientId: true },
    });
    expect(prisma.labExam.deleteMany).toHaveBeenCalledWith({
      where: { id: 'exam-1', creatorId: user.sub, clientId: dto.clientId },
    });
    expect(prisma.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.labExam.deleteMany.mock.invocationCallOrder[0],
    );
  });
  it('denies foreign exam IDs without reading clinical content or deleting', async () => {
    prisma.labExam.findFirst.mockResolvedValue(null);
    await expect(service.remove(user, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
    expect(prisma.labExam.deleteMany).not.toHaveBeenCalled();
  });
  it('denies deletion when the routed Client is foreign', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.remove(user, 'exam-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.labExam.deleteMany).not.toHaveBeenCalled();
  });
  it('denies ADMIN for new aggregate and deletion operations', async () => {
    await expect(
      service.findAll({ ...user, role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.remove({ ...user, role: 'ADMIN' }, 'exam-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.labExam.findMany).not.toHaveBeenCalled();
    expect(prisma.labExam.findFirst).not.toHaveBeenCalled();
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
