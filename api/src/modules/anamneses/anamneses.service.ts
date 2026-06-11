import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';

@Injectable()
export class AnamnesesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateAnamnesisDto, creatorId: string) {
    return this.prisma.anamnesis.create({
      data: {
        ...createDto,
        creatorId,
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.anamnesis.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true } }
      }
    });
  }
}