import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AssessmentsService } from './assessments.service';

const PROFESSIONAL_ID = 'professional-1';
const CLIENT_ID = 'client-1';

type ProfessionalCreate = (
  dto: CreateAssessmentDto,
  professionalId: string,
) => Promise<unknown>;

type ProfessionalRemove = (
  assessmentId: string,
  professionalId: string,
) => Promise<unknown>;

describe('AssessmentsService professional Client ownership', () => {
  const prisma = {
    client: { findFirst: jest.fn() },
    professionalPatientLink: { findUnique: jest.fn() },
    physicalAssessment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: AssessmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
    prisma.physicalAssessment.create.mockResolvedValue({
      id: 'assessment-1',
      clientId: CLIENT_ID,
    });
    service = new AssessmentsService(prisma as unknown as PrismaService);
  });

  it('creates an assessment only after resolving an owned Client', async () => {
    const create = service.create.bind(service) as unknown as ProfessionalCreate;

    await create(
      { clientId: CLIENT_ID, weight: 72.4 } as unknown as CreateAssessmentDto,
      PROFESSIONAL_ID,
    );

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, professionalId: PROFESSIONAL_ID },
      select: { id: true },
    });
    expect(prisma.physicalAssessment.create).toHaveBeenCalledWith({
      data: {
        clientId: CLIENT_ID,
        userId: null,
        weight: 72.4,
      },
    });
  });

  it('rejects a Client owned by another professional before writing', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    const create = service.create.bind(service) as unknown as ProfessionalCreate;

    await expect(
      create(
        { clientId: CLIENT_ID, weight: 72.4 } as unknown as CreateAssessmentDto,
        PROFESSIONAL_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
  });

  it('lists only assessments from Clients owned by the current professional', async () => {
    prisma.physicalAssessment.findMany.mockResolvedValue([]);

    await service.findAll(PROFESSIONAL_ID);

    expect(prisma.physicalAssessment.findMany).toHaveBeenCalledWith({
      where: { client: { professionalId: PROFESSIONAL_ID } },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  });

  it('does not delete an assessment owned by another professional', async () => {
    prisma.physicalAssessment.findFirst.mockResolvedValue(null);
    const remove = service.remove.bind(service) as unknown as ProfessionalRemove;

    await expect(
      remove('assessment-1', PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.physicalAssessment.delete).not.toHaveBeenCalled();
  });
});
