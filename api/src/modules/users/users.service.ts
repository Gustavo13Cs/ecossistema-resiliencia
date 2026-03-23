// api/src/modules/users/users.service.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Regra de Negócio: O e-mail já está cadastrado na empresa?
    const userExists = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (userExists) {
      throw new ConflictException('Este e-mail já está em uso por outro colaborador.');
    }

    // 2. Segurança: Criptografando a senha (Geramos um 'salt' de 10 rounds)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 3. Persistência: Salvando no Supabase
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
}