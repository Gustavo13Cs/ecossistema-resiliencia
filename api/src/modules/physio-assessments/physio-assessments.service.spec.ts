import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { PhysioAssessmentsService } from './physio-assessments.service';

const dto = {
  clientId: 'client-1',
  chiefComplaint: 'Dor no joelho',
  painLevel: 4,
};
interface AssessmentContract {
  create(user: AuthUser, data: typeof dto): Promise<unknown>;
  findByClient(user: AuthUser, clientId: string): Promise<unknown>;
  findAllByProfessional(user: AuthUser): Promise<unknown>;
  remove(user: AuthUser, id: string): Promise<unknown>;
}

describe('PhysioAssessmentsService Client ownership', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'PHYSIO' };
  const prisma = {
    client: { findFirst: jest.fn() },
    physioAssessment: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    physicalAssessment: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: AssessmentContract;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhysioAssessmentsService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<AssessmentContract>(PhysioAssessmentsService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({
      id: dto.clientId,
      professionalId: user.sub,
    });
    prisma.physioAssessment.findFirst.mockResolvedValue({
      id: 'assessment-1',
      clientId: dto.clientId,
    });
  });
  afterEach(() => {
    for (const method of Object.values(prisma.physicalAssessment))
      expect(method).not.toHaveBeenCalled();
  });

  it('creates in PhysioAssessment with the authenticated creator and owned Client', async () => {
    await service.create(user, dto);
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: dto.clientId, professionalId: user.sub },
    });
    const creation: unknown = prisma.physioAssessment.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: {
        ...dto,
        creatorId: user.sub,
        userId: null,
      },
    });
  });
  it('rejects foreign Client create and history before clinical queries', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.findByClient(user, dto.clientId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.physioAssessment.create).not.toHaveBeenCalled();
    expect(prisma.physioAssessment.findMany).not.toHaveBeenCalled();
  });
  it('filters history by Client and creator', async () => {
    await service.findByClient(user, dto.clientId);
    expect(prisma.physioAssessment.findMany).toHaveBeenCalledWith({
      where: { clientId: dto.clientId, creatorId: user.sub },
      orderBy: { date: 'desc' },
    });
  });
  it('filters the central list by creator and Client owner', async () => {
    await service.findAllByProfessional(user);
    expect(prisma.physioAssessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId: user.sub, client: { professionalId: user.sub } },
      }),
    );
  });
  it('hides another creator assessment before deletion', async () => {
    prisma.physioAssessment.findFirst.mockResolvedValue(null);
    await expect(service.remove(user, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.physioAssessment.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', creatorId: user.sub },
      select: { clientId: true },
    });
    expect(prisma.physioAssessment.delete).not.toHaveBeenCalled();
  });
  it('checks Client ownership before deleting an authored assessment', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.remove(user, 'assessment-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.physioAssessment.delete).not.toHaveBeenCalled();
  });
  it('does not expose an unassigned legacy assessment', async () => {
    prisma.physioAssessment.findFirst.mockResolvedValue({ clientId: null });
    await expect(service.remove(user, 'legacy')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.physioAssessment.delete).not.toHaveBeenCalled();
  });
  it('deletes only the owned Client assessment', async () => {
    await service.remove(user, 'assessment-1');
    expect(prisma.physioAssessment.delete).toHaveBeenCalledWith({
      where: {
        id: 'assessment-1',
        clientId: dto.clientId,
        creatorId: user.sub,
      },
    });
  });
  it.each(['ADMIN', 'PATIENT', 'PERSONAL', 'NUTRITIONIST'] as const)(
    'rejects %s before clinical access',
    async (role) => {
      const denied = { ...user, role };
      await expect(service.create(denied, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.findAllByProfessional(denied),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.findByClient(denied, dto.clientId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.remove(denied, 'assessment-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.physioAssessment.findFirst).not.toHaveBeenCalled();
    },
  );
});
