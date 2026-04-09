import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: any, creatorId: string) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        managerId: creatorId, 
      },
    });
  }

  async findAll(managerId: string) {
    return this.prisma.user.findMany({
      where: {
        managerId: managerId, 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserWorkouts(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id: id },
    });
  }
}