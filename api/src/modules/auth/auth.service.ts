import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthSessionService } from './auth-session.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly sessions: AuthSessionService,
  ) {}

  async login(loginDto: LoginDto) {
    const email = normalizeEmail(loginDto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        authVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    return this.sessions.create(user);
  }

  async register(registerDto: RegisterDto) {
    const email = normalizeEmail(registerDto.email);
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const newUser = await this.prisma.user.create({
      data: {
        name: registerDto.name.trim(),
        email,
        password: hashedPassword,
        phone: registerDto.phone?.trim() || undefined,
        companyName: registerDto.companyName?.trim() || undefined,
        role: registerDto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        role: true,
        createdAt: true,
      },
    });

    return newUser;
  }

  refresh(rawToken: string) {
    return this.sessions.rotate(rawToken);
  }

  logout(rawToken: string) {
    return this.sessions.revoke(rawToken);
  }
}
