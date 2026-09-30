import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateConsultationNoteDto } from './dto/create-consultation-note.dto';
import { UpdateConsultationNoteDto } from './dto/update-consultation-note.dto';

@Injectable()
export class ConsultationNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, dto: CreateConsultationNoteDto) {
    this.assertNutritionist(user);
    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    return this.prisma.consultationNote.create({
      data: {
        clientId: client.id,
        creatorId: user.sub,
        patientId: null,
        content: dto.content,
        tags: dto.tags,
        nextSteps: dto.nextSteps,
      },
      include: { creator: { select: { name: true } } },
    });
  }

  async findByClient(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.consultationNote.findMany({
      where: { clientId, creatorId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { name: true } } },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateConsultationNoteDto) {
    const clientId = await this.getOwnedNoteClient(user, id);
    return this.prisma.consultationNote.update({
      where: { id, clientId, creatorId: user.sub },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.nextSteps !== undefined && { nextSteps: dto.nextSteps }),
      },
      include: { creator: { select: { name: true } } },
    });
  }

  async remove(user: AuthUser, id: string) {
    const clientId = await this.getOwnedNoteClient(user, id);
    return this.prisma.consultationNote.delete({
      where: { id, clientId, creatorId: user.sub },
    });
  }

  private async getOwnedNoteClient(user: AuthUser, id: string) {
    this.assertNutritionist(user);
    const note = await this.prisma.consultationNote.findFirst({
      where: { id, creatorId: user.sub },
      select: { clientId: true },
    });
    if (!note?.clientId)
      throw new NotFoundException('Nota de consulta não encontrada');
    await this.clientAccess.getOwnedClient(user, note.clientId);
    return note.clientId;
  }

  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
