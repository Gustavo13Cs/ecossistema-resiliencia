import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreatePhysioAssessmentDto } from './dto/create-physio-assessment.dto';

@Injectable()
export class PhysioAssessmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePhysioAssessmentDto) {
    return this.prisma.physicalAssessment.create({ data });
  }

  // Busca todas as avaliações feitas por este fisioterapeuta (para a tabela da Central)
  async findAllByProfessional(professionalId: string) {
    return this.prisma.physicalAssessment.findMany({
      where: {
        user: { professionals: { some: { id: professionalId } } }
      },
      include: { user: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });
  }

  // Busca o histórico de um paciente específico (para o Prontuário)
  async findByUser(userId: string) {
    return this.prisma.physicalAssessment.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
  }

  async remove(id: string) {
    return this.prisma.physicalAssessment.delete({ where: { id } });
  }
}