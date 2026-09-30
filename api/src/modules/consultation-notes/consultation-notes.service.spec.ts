import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { ConsultationNotesService } from './consultation-notes.service';

const dto = {
  clientId: 'client-1',
  content: 'Nota de teste',
  tags: 'retorno',
  nextSteps: 'Reavaliar',
};
interface NoteContract {
  create(user: AuthUser, data: typeof dto): Promise<unknown>;
  findByClient(user: AuthUser, clientId: string): Promise<unknown>;
  update(
    user: AuthUser,
    id: string,
    data: { content: string },
  ): Promise<unknown>;
  remove(user: AuthUser, id: string): Promise<unknown>;
}
describe('ConsultationNotesService Client ownership', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'NUTRITIONIST' };
  const prisma = {
    client: { findFirst: jest.fn() },
    consultationNote: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: NoteContract;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConsultationNotesService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ConsultationNotesService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({ id: dto.clientId });
    prisma.consultationNote.findFirst.mockResolvedValue({
      clientId: dto.clientId,
    });
    prisma.consultationNote.findUnique.mockResolvedValue({
      id: 'note-1',
      creatorId: user.sub,
      clientId: dto.clientId,
    });
  });
  it('creates a Client note with the JWT author and null legacy ID', async () => {
    await service.create(user, dto);
    const creation: unknown = prisma.consultationNote.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: { ...dto, creatorId: user.sub, patientId: null },
    });
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: dto.clientId, professionalId: user.sub },
    });
  });
  it('denies unknown and foreign Clients before resource access', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.findByClient(user, dto.clientId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.consultationNote.create).not.toHaveBeenCalled();
    expect(prisma.consultationNote.findMany).not.toHaveBeenCalled();
  });
  it('filters every history query by Client and author', async () => {
    await service.findByClient(user, dto.clientId);
    expect(prisma.consultationNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: dto.clientId, creatorId: user.sub },
      }),
    );
  });
  it('hides foreign note IDs before update or deletion', async () => {
    prisma.consultationNote.findFirst.mockResolvedValue(null);
    await expect(
      service.update(user, 'foreign', { content: 'Change' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(user, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.consultationNote.update).not.toHaveBeenCalled();
    expect(prisma.consultationNote.delete).not.toHaveBeenCalled();
    expect(prisma.consultationNote.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', creatorId: user.sub },
      select: { clientId: true },
    });
  });
  it('verifies Client ownership on both mutations', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(
      service.update(user, 'note-1', { content: 'Change' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(user, 'note-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.consultationNote.update).not.toHaveBeenCalled();
    expect(prisma.consultationNote.delete).not.toHaveBeenCalled();
  });
  it('updates and deletes using the verified Client and authenticated creator', async () => {
    await service.update(user, 'note-1', { content: 'Change' });
    await service.remove(user, 'note-1');
    const where = { id: 'note-1', clientId: dto.clientId, creatorId: user.sub };
    expect(prisma.consultationNote.update).toHaveBeenCalledWith(
      expect.objectContaining({ where, data: { content: 'Change' } }),
    );
    expect(prisma.consultationNote.delete).toHaveBeenCalledWith({ where });
  });
  it.each(['ADMIN', 'PATIENT', 'PERSONAL', 'PHYSIO'] as const)(
    'denies %s before accessing notes',
    async (role) => {
      const denied = { ...user, role };
      await expect(service.create(denied, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.findByClient(denied, dto.clientId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.update(denied, 'note-1', { content: 'Change' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove(denied, 'note-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.consultationNote.findFirst).not.toHaveBeenCalled();
    },
  );
});
