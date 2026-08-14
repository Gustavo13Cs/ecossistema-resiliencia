import { Role } from '@prisma/client';

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
