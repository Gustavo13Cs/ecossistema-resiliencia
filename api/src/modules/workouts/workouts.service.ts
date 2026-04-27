import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWorkoutDto: any) {
    throw new NotImplementedException('O módulo de treinos está sendo reestruturado para o perfil de Personal Trainer.');
  }

  async findAll(userId: string, role: string) {
    return [];
  }
}