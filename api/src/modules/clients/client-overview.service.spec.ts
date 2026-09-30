import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { ClientOverviewService } from './client-overview.service';

describe('ClientOverviewService', () => {
  const professional: AuthUser = {
    sub: 'professional-1',
    role: 'NUTRITIONIST',
  };
  const client = {
    id: 'client-1',
    professionalId: professional.sub,
    name: 'Ana Cliente',
    goal: 'Saude',
    allergies: null,
    pathologies: null,
    height: 168,
    initialWeight: 72,
    gender: 'FEMALE',
    birthDate: new Date('1990-01-01T00:00:00.000Z'),
  };
  const clientAccess = {
    getOwnedClient: jest.fn(),
  };
  const prisma = {
    dietPlan: { findFirst: jest.fn() },
    workout: { findFirst: jest.fn() },
    rehabPlan: { findFirst: jest.fn() },
    physicalAssessment: { findMany: jest.fn() },
    labExam: { findFirst: jest.fn() },
    patientAlert: { findMany: jest.fn() },
    physioAssessment: { findFirst: jest.fn() },
  };

  let service: ClientOverviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    clientAccess.getOwnedClient.mockResolvedValue(client);
    prisma.dietPlan.findFirst.mockResolvedValue(null);
    prisma.workout.findFirst.mockResolvedValue(null);
    prisma.rehabPlan.findFirst.mockResolvedValue(null);
    prisma.physicalAssessment.findMany.mockResolvedValue([]);
    prisma.labExam.findFirst.mockResolvedValue(null);
    prisma.patientAlert.findMany.mockResolvedValue([]);
    prisma.physioAssessment.findFirst.mockResolvedValue(null);

    service = new ClientOverviewService(prisma as never, clientAccess as never);
  });

  it('resolves the owned Client before querying every aggregate by clientId and author', async () => {
    let resolveOwnedClient!: (ownedClient: typeof client) => void;
    clientAccess.getOwnedClient.mockReturnValue(
      new Promise((resolve) => {
        resolveOwnedClient = resolve;
      }),
    );

    const overviewPromise = service.getOverview(professional, client.id);
    await Promise.resolve();

    expect(prisma.dietPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    expect(prisma.rehabPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.findMany).not.toHaveBeenCalled();
    expect(prisma.labExam.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientAlert.findMany).not.toHaveBeenCalled();
    expect(prisma.physioAssessment.findFirst).not.toHaveBeenCalled();

    resolveOwnedClient(client);
    const result = await overviewPromise;

    expect(clientAccess.getOwnedClient).toHaveBeenCalledWith(
      professional,
      client.id,
    );
    expect(prisma.dietPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: client.id,
          creatorId: professional.sub,
          isActive: true,
        },
      }),
    );
    expect(prisma.workout.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: client.id,
          creatorId: professional.sub,
          isActive: true,
        },
      }),
    );
    expect(prisma.rehabPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: client.id,
          creatorId: professional.sub,
          isActive: true,
        },
      }),
    );
    expect(prisma.physicalAssessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: client.id } }),
    );
    expect(prisma.labExam.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: client.id, creatorId: professional.sub },
      }),
    );
    expect(prisma.patientAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: client.id, professionalId: professional.sub },
      }),
    );
    expect(prisma.physioAssessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: client.id, creatorId: professional.sub },
      }),
    );

    const aggregateCalls = [
      prisma.dietPlan.findFirst,
      prisma.workout.findFirst,
      prisma.rehabPlan.findFirst,
      prisma.physicalAssessment.findMany,
      prisma.labExam.findFirst,
      prisma.patientAlert.findMany,
      prisma.physioAssessment.findFirst,
    ].flatMap((query): unknown[] => query.mock.calls);
    expect(JSON.stringify(aggregateCalls)).not.toMatch(/userId|patientId/);
    expect(result.client).toMatchObject({ id: client.id, name: client.name });
  });

  it('does not run aggregate queries when the Client belongs to another professional', async () => {
    clientAccess.getOwnedClient.mockRejectedValue(
      new NotFoundException('Cliente nao encontrado'),
    );

    await expect(
      service.getOverview(professional, 'client-from-another-professional'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.dietPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    expect(prisma.rehabPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.findMany).not.toHaveBeenCalled();
    expect(prisma.labExam.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientAlert.findMany).not.toHaveBeenCalled();
    expect(prisma.physioAssessment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects ADMIN before running any aggregate query', async () => {
    const admin: AuthUser = { sub: 'admin-1', role: 'ADMIN' };
    clientAccess.getOwnedClient.mockRejectedValue(
      new ForbiddenException('Acesso permitido somente a profissional clinico'),
    );

    await expect(service.getOverview(admin, client.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(clientAccess.getOwnedClient).toHaveBeenCalledWith(admin, client.id);
    expect(prisma.dietPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    expect(prisma.rehabPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.findMany).not.toHaveBeenCalled();
    expect(prisma.labExam.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientAlert.findMany).not.toHaveBeenCalled();
    expect(prisma.physioAssessment.findFirst).not.toHaveBeenCalled();
  });
});
