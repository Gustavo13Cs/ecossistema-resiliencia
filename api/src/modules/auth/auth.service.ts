import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { manager: true } 
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const businessContext = (user.role === 'HR_MANAGER' || user.role === 'ADMIN')
      ? user.profession
      : user.manager?.profession || 'PERSONAL_TRAINER'; 
    const payload = { 
      sub: user.id, 
      role: user.role,
      email: user.email,
      businessContext: businessContext 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(signUpDto: any) {
    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        ...signUpDto,
        password: hashedPassword, 
        role: 'HR_MANAGER',
      },
    });

    return newUser;
  }
}