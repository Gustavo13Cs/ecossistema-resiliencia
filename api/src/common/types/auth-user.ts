import { Role } from '@prisma/client';

export type AccessTokenPayload = {
  sub: string;
  jti: string;
  authVersion: number;
};

export type AuthUser = {
  sub: string;
  role: Role;
  email?: string;
  name?: string;
};

export const CLINICAL_PROFESSIONAL_ROLES: Role[] = [
  'NUTRITIONIST',
  'PERSONAL',
  'PHYSIO',
];
