import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email }
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const payload = { 
      sub: user.id, 
      name: user.name,
      role: user.role,
      email: user.email,
      businessContext: user.role 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(signUpDto: any) {
    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        name: signUpDto.name,
        email: signUpDto.email,
        password: hashedPassword,
        phone: signUpDto.phone,
        companyName: signUpDto.companyName,
        role: signUpDto.role || 'PATIENT', 
      },
    });

    return newUser;
  }
}