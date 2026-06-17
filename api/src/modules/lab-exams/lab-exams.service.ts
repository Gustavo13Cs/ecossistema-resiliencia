import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';

@Injectable()
export class LabExamsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateLabExamDto, creatorId: string) {
    return this.prisma.labExam.create({
      data: {
        date: new Date(data.date),
        notes: data.notes,
        patientId: data.patientId,
        creatorId,
        markers: {
          create: data.markers.map(m => ({
            name: m.name,
            value: m.value,
            unit: m.unit,
          })),
        },
      },
    });
  }

  // Busca ordenada pela data do exame (do mais antigo para o mais novo facilita o gráfico)
  async findByPatient(patientId: string) {
    return this.prisma.labExam.findMany({
      where: { patientId },
      orderBy: { date: 'asc' },
      include: { markers: true },
    });
  }
}