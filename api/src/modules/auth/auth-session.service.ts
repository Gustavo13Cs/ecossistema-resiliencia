import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthUser } from '../../common/types/auth-user';
import {
  createRefreshToken,
  matchesRefreshToken,
  parseRefreshToken,
} from './refresh-token';

export type SessionUser = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'authVersion'
>;
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  authVersion: true,
} as const;
const REFRESH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async create(loginUser: SessionUser) {
    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${loginUser.id} FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: loginUser.id },
          select: USER_SELECT,
        });
        if (!user || user.authVersion !== loginUser.authVersion) return null;
        const id = randomUUID();
        const token = createRefreshToken(id);
        const expiresAt = new Date(Date.now() + REFRESH_LIFETIME_MS);
        await tx.authSession.create({
          data: {
            id,
            userId: user.id,
            refreshTokenHash: token.hash,
            expiresAt,
          },
        });
        return this.issue(user, id, token.rawToken, expiresAt);
      },
    );
    if (!result) throw this.invalidSession();
    return result;
  }

  async rotate(rawToken: string) {
    const { sessionId } = parseRefreshToken(rawToken);
    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const session = await this.lockSession(tx, sessionId);
        if (
          !session ||
          session.revokedAt ||
          session.expiresAt.getTime() <= Date.now()
        )
          return null;
        if (!matchesRefreshToken(session.refreshTokenHash, rawToken)) {
          // Não lance dentro da transação: o rollback desfaria a revogação por replay.
          await tx.authSession.update({
            where: { id: sessionId },
            data: { revokedAt: new Date() },
          });
          return null;
        }
        const next = createRefreshToken(sessionId);
        await tx.authSession.update({
          where: { id: sessionId },
          data: { refreshTokenHash: next.hash, lastUsedAt: new Date() },
        });
        return this.issue(
          session.user,
          sessionId,
          next.rawToken,
          session.expiresAt,
        );
      },
    );
    if (!result) throw this.invalidSession();
    return result;
  }

  async revoke(rawToken: string) {
    const { sessionId } = parseRefreshToken(rawToken);
    const revoked = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const session = await this.lockSession(tx, sessionId);
        if (
          !session ||
          !matchesRefreshToken(session.refreshTokenHash, rawToken)
        )
          return false;
        if (!session.revokedAt)
          await tx.authSession.update({
            where: { id: sessionId },
            data: { revokedAt: new Date() },
          });
        return true;
      },
    );
    if (!revoked) throw this.invalidSession();
  }

  async revokeAll(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    await tx.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateAccess(payload: unknown): Promise<AuthUser> {
    if (!payload || typeof payload !== 'object') throw this.invalidSession();
    const { sub, jti, authVersion } = payload as Record<string, unknown>;
    if (
      typeof sub !== 'string' ||
      typeof jti !== 'string' ||
      !Number.isSafeInteger(authVersion) ||
      (authVersion as number) < 0
    )
      throw this.invalidSession();
    const session = await this.prisma.authSession.findUnique({
      where: { id: jti },
      include: { user: { select: USER_SELECT } },
    });
    if (
      !session ||
      session.userId !== sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.authVersion !== authVersion
    )
      throw this.invalidSession();
    return this.identity(session.user);
  }

  private async lockSession(tx: Prisma.TransactionClient, sessionId: string) {
    const lookup = await tx.authSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!lookup) return null;
    // Ordem única de locks: User -> AuthSession, igual à invalidação da conta.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${lookup.userId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${sessionId} FOR UPDATE`;
    return tx.authSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: USER_SELECT } },
    });
  }

  private async issue(
    user: SessionUser,
    sessionId: string,
    refreshToken: string,
    expiresAt: Date,
  ) {
    return {
      access_token: await this.jwt.signAsync({
        sub: user.id,
        jti: sessionId,
        authVersion: user.authVersion,
      }),
      refresh_token: refreshToken,
      refresh_expires_at: expiresAt,
      user: this.identity(user),
    };
  }

  private identity(user: SessionUser): AuthUser {
    return {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  private invalidSession() {
    return new UnauthorizedException('Sessão inválida');
  }
}
