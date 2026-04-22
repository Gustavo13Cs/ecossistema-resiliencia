import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  // Cria uma nova avaliação
  async create(createAssessmentDto: CreateAssessmentDto) {
    return this.prisma.physicalAssessment.create({
      data: createAssessmentDto,
    });
  }

  // Busca o histórico do paciente ordenado pela data (do mais antigo para o mais novo)
  async findByUser(userId: string) {
    return this.prisma.physicalAssessment.findMany({
      where: { userId },
      orderBy: { date: 'asc' }, 
    });
  }

  // Apaga uma avaliação caso o Nutri tenha errado
  async remove(id: string) {
    return this.prisma.physicalAssessment.delete({
      where: { id },
    });
  }
}