// api/src/modules/users/users.service.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (userExists) {
      throw new ConflictException('Este e-mail já está em uso por outro colaborador.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
        department: createUserDto.department,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  
  async getUserWorkouts(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

