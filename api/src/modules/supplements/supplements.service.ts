import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class SupplementsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, creatorId: string) {
    return this.prisma.supplementPlan.create({
      data: {
        title: data.title, notes: data.notes, patientId: data.patientId, creatorId,
        items: {
          create: data.items.map((i: any) => ({
            name: i.name, composition: i.composition, dosage: i.dosage, instructions: i.instructions
          }))
        }
      }
    });
  }

  async findActiveByUser(patientId: string) {
    return this.prisma.supplementPlan.findFirst({
      where: { patientId }, orderBy: { createdAt: 'desc' }, include: { items: true }
    });
  }
}