import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Lê o token do cookie HttpOnly primeiro; se não encontrar, tenta o header Bearer
      // (suporte dual: produção usa cookie, testes via Postman/Insomnia usam Bearer)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string; email: string; role: string; name: string }) {
    if (!payload.sub) throw new UnauthorizedException();

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  }
}