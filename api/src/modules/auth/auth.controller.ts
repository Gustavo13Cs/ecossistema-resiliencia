import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.login(loginDto);
    
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true em prod
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    // Retorna o token no body também — o frontend precisa dele para salvar no localStorage
    return { access_token, message: 'Login realizado com sucesso' };
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}