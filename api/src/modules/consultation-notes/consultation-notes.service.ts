import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateConsultationNoteDto } from './dto/create-consultation-note.dto';
import { UpdateConsultationNoteDto } from './dto/update-consultation-note.dto';

@Injectable()
export class ConsultationNotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConsultationNoteDto, creatorId: string) {
    return this.prisma.consultationNote.create({
      data: {
        content: dto.content,
        tags: dto.tags,
        nextSteps: dto.nextSteps,
        patientId: dto.patientId,
        creatorId,
      },
      include: {
        creator: { select: { name: true } },
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.consultationNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateConsultationNoteDto, requesterId: string) {
    const note = await this.prisma.consultationNote.findUnique({ where: { id } });

    if (!note) throw new NotFoundException('Nota de consulta não encontrada');
    if (note.creatorId !== requesterId) {
      throw new ForbiddenException('Você só pode editar notas que criou');
    }

    return this.prisma.consultationNote.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.nextSteps !== undefined && { nextSteps: dto.nextSteps }),
      },
      include: {
        creator: { select: { name: true } },
      },
    });
  }

  async remove(id: string, requesterId: string) {
    const note = await this.prisma.consultationNote.findUnique({ where: { id } });

    if (!note) throw new NotFoundException('Nota de consulta não encontrada');
    if (note.creatorId !== requesterId) {
      throw new ForbiddenException('Você só pode deletar notas que criou');
    }

    return this.prisma.consultationNote.delete({ where: { id } });
  }
}
