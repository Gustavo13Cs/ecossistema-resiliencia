import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createAssessmentDto: CreateAssessmentDto) {
    return this.prisma.physicalAssessment.create({
      data: createAssessmentDto,
    });
  }

  async findByUser(userId: string) {
    return this.prisma.physicalAssessment.findMany({
      where: { userId },
      orderBy: { date: 'asc' }, 
    });
  }

  async remove(id: string) {
    return this.prisma.physicalAssessment.delete({
      where: { id },
    });
  }

 async findAll(professionalId: string) {
    return this.prisma.physicalAssessment.findMany({
      where: {
        user: {
          professionals: {
            some: {
              id: professionalId
            }
          }
        }
      },
      include: {
        user: { select: { name: true } } 
      },
      orderBy: { date: 'desc' }
    });
  }
}