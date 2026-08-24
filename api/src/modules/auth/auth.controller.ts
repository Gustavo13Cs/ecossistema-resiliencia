import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser } from '../../common/types/auth-user';
import { generateCsrfToken } from '../../common/security/csrf-protection';
import { AUTH_COOKIE_POLICY } from './auth-cookie-options';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.authService.login(loginDto);

    res.cookie('access_token', access_token, AUTH_COOKIE_POLICY.set);

    return { message: 'Login realizado com sucesso' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const authenticatedUser = req.user as AuthUser;
    const user: AuthUser = {
      sub: authenticatedUser.sub,
      role: authenticatedUser.role,
      ...(authenticatedUser.email ? { email: authenticatedUser.email } : {}),
      ...(authenticatedUser.name ? { name: authenticatedUser.name } : {}),
    };
    const csrfToken = generateCsrfToken();

    res.cookie('csrf_token', csrfToken, AUTH_COOKIE_POLICY.set);

    return { user, csrfToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', AUTH_COOKIE_POLICY.clear);
    res.clearCookie('csrf_token', AUTH_COOKIE_POLICY.clear);
    return { message: 'Logout realizado com sucesso' };
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
