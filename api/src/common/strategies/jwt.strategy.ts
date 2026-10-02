import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthSessionService } from '../../modules/auth/auth-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly sessions: AuthSessionService) {
    super({
      // Lê o token do cookie HttpOnly primeiro; se não encontrar, tenta o header Bearer
      // (suporte dual: produção usa cookie, testes via Postman/Insomnia usam Bearer)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookies = req?.cookies as Record<string, unknown> | undefined;
          return typeof cookies?.access_token === 'string'
            ? cookies.access_token
            : null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  validate(payload: unknown) {
    return this.sessions.validateAccess(payload);
  }
}
