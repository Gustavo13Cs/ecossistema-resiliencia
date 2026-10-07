import { Injectable } from '@nestjs/common';
import { AuthPrismaService } from '../../infra/database/database-clients';
import { PrismaService } from '../../infra/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthSessionService } from '../auth/auth-session.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AuthSessionService,
    private readonly authentication: AuthPrismaService,
  ) {}

  // Operações internas: o endpoint de perfil não aceita role, senha ou authVersion.
  changeRole(id: string, role: Role) {
    return this.updateAuthentication(id, { role });
  }

  async resetCredentials(id: string, password: string) {
    return this.updateAuthentication(id, {
      password: await bcrypt.hash(password, 12),
    });
  }

  invalidateAuthentication(id: string) {
    return this.updateAuthentication(id, {});
  }

  private async updateAuthentication(
    id: string,
    changes: { role?: Role; password?: string },
  ) {
    return this.authentication.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
        const user = await tx.user.update({
          where: { id },
          data: { ...changes, authVersion: { increment: 1 } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            authVersion: true,
          },
        });
        await this.sessions.revokeAll(id, tx);
        return user;
      },
    );
  }

  async findOne(id: string, canAccessClinicalFields: boolean) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        birthDate: true,
        height: true,
        initialWeight: true,
        goal: true,
        allergies: true,
        pathologies: true,
        typicalSleep: true,
        stressLevel: true,
        foodRelationship: true,
        psychologyHistory: true,
        exerciseType: true,
        exerciseFrequency: true,
        exerciseDuration: true,
        workActivityLevel: true,
        role: true,
        createdAt: true,
        tmb: true,
        get: true,
        activityFactor: true,
        nutritionistNotes: canAccessClinicalFields,
      },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    canUpdateClinicalFields: boolean,
  ) {
    const {
      nutritionistNotes,
      tmb,
      get,
      activityFactor,
      ...nonClinicalFields
    } = updateUserDto;
    const data = canUpdateClinicalFields
      ? { ...nonClinicalFields, nutritionistNotes, tmb, get, activityFactor }
      : nonClinicalFields;

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        birthDate: true,
        updatedAt: true,
      },
    });
  }
}
