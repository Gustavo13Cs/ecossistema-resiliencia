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
  Header,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, AuthenticatedRequest } from '../../common/types/auth-user';
import {
  generateCsrfToken,
  isValidCsrfToken,
} from '../../common/security/csrf-protection';
import { AUTH_COOKIE_POLICIES } from './auth-cookie-options';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(loginDto);
    this.setSessionCookies(res, session);

    return { message: 'Login realizado com sucesso' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  me(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authenticatedUser = req.user;
    const user: AuthUser = {
      sub: authenticatedUser.sub,
      role: authenticatedUser.role,
      ...(authenticatedUser.email ? { email: authenticatedUser.email } : {}),
      ...(authenticatedUser.name ? { name: authenticatedUser.name } : {}),
    };
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const existingCsrfToken = cookies?.csrf_token;
    const hasValidCsrfToken = isValidCsrfToken(existingCsrfToken);
    const csrfToken = hasValidCsrfToken
      ? existingCsrfToken
      : generateCsrfToken();

    if (!hasValidCsrfToken) {
      res.cookie('csrf_token', csrfToken, AUTH_COOKIE_POLICIES.csrf.set);
    }

    return { user, csrfToken };
  }

  @Public()
  @Get('csrf')
  @Header('Cache-Control', 'no-store')
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const existing = cookies?.csrf_token;
    const csrfToken = isValidCsrfToken(existing)
      ? existing
      : generateCsrfToken();
    res.cookie('csrf_token', csrfToken, AUTH_COOKIE_POLICIES.csrf.set);
    return { csrfToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const session = await this.authService.refresh(
        this.refreshCredential(req),
      );
      const csrfToken = this.setSessionCookies(res, session);
      return { user: session.user, csrfToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.clearSessionCookies(res);
      }
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      await this.authService.logout(this.refreshCredential(req));
    } finally {
      this.clearSessionCookies(res);
    }
    return { message: 'Logout realizado com sucesso' };
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  private refreshCredential(req: Request) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    if (typeof cookies?.refresh_token !== 'string')
      throw new UnauthorizedException('Sessão inválida');
    return cookies.refresh_token;
  }

  private setSessionCookies(
    res: Response,
    session: Awaited<ReturnType<AuthService['login']>>,
  ) {
    const csrfToken = generateCsrfToken();
    res.cookie(
      'access_token',
      session.access_token,
      AUTH_COOKIE_POLICIES.access.set,
    );
    res.cookie('refresh_token', session.refresh_token, {
      ...AUTH_COOKIE_POLICIES.refresh.set,
      maxAge: Math.max(0, session.refresh_expires_at.getTime() - Date.now()),
    });
    res.cookie('csrf_token', csrfToken, AUTH_COOKIE_POLICIES.csrf.set);
    return csrfToken;
  }

  private clearSessionCookies(res: Response) {
    res.clearCookie('access_token', AUTH_COOKIE_POLICIES.access.clear);
    res.clearCookie('refresh_token', AUTH_COOKIE_POLICIES.refresh.clear);
    res.clearCookie('csrf_token', AUTH_COOKIE_POLICIES.csrf.clear);
  }
}
