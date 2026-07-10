import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateRehabPlanDto } from './dto/create-rehab-plan.dto';

@Injectable()
export class RehabPlansService {
  constructor(private prisma: PrismaService) {}

  async create(professionalId: string, data: CreateRehabPlanDto) {
    const { sessions, userId, ...planData } = data;

    await this.prisma.rehabPlan.updateMany({
      where: { userId: userId, isActive: true },
      data: { isActive: false }
    });

    return this.prisma.rehabPlan.create({
      data: {
        ...planData,
        userId: userId,
        creatorId: professionalId,
        isActive: true,
        sessions: {
          create: sessions.map(session => ({
            name: session.name,
            focus: session.focus,
            exercises: {
              create: session.exercises.map(ex => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                notes: ex.notes
              }))
            }
          }))
        }
      }
    });
  }

  async findAllByProfessional(professionalId: string) {
    return this.prisma.rehabPlan.findMany({
      where: { creatorId: professionalId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findActiveByUser(userId: string) {
    return this.prisma.rehabPlan.findFirst({
      where: { userId: userId, isActive: true },
      include: {
        sessions: { include: { exercises: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async remove(id: string, requesterId: string) {
  const plan = await this.prisma.rehabPlan.findUnique({ where: { id } });

  if (!plan) throw new NotFoundException('Plano de reabilitação não encontrado');

  if (plan.creatorId !== requesterId) {
    throw new ForbiddenException('Você não pode deletar um plano que não criou');
  }

  return this.prisma.rehabPlan.delete({ where: { id } });
}
}