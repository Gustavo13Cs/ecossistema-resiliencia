import { Role } from '@prisma/client';
import type { Request } from 'express';

export type AccessTokenPayload = {
  sub: string;
  jti: string;
  authVersion: number;
};

export type AuthUser = {
  sub: string;
  role: Role;
  sessionId?: string;
  email?: string;
  name?: string;
};

export type AuthenticatedRequest = Request & { user: AuthUser };

export const CLINICAL_PROFESSIONAL_ROLES: Role[] = [
  'NUTRITIONIST',
  'PERSONAL',
  'PHYSIO',
];
