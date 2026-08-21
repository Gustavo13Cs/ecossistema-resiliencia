import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthUser, CLINICAL_PROFESSIONAL_ROLES } from '../types/auth-user';

@Injectable()
export class PatientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertProfessionalLink(
    user: AuthUser,
    patientId: string,
  ): Promise<void> {
    this.assertClinicalProfessional(user);

    const link = await this.prisma.professionalPatientLink.findFirst({
      where: {
        professionalId: user.sub,
        patientId,
        isActive: true,
      },
    });

    if (!link) {
      throw new ForbiddenException('Paciente sem vínculo ativo');
    }
  }

  assertPatientSelf(user: AuthUser, patientId: string): void {
    if (user.role !== 'PATIENT' || user.sub !== patientId) {
      throw new ForbiddenException(
        'Acesso permitido somente ao próprio paciente',
      );
    }
  }

  async assertCanReadPatient(user: AuthUser, patientId: string): Promise<void> {
    if (user.role === 'PATIENT') {
      this.assertPatientSelf(user, patientId);
      return;
    }

    await this.assertProfessionalLink(user, patientId);
  }

  assertTaskAuthor(user: AuthUser, professionalId: string): void {
    this.assertClinicalProfessional(user);

    if (user.sub !== professionalId) {
      throw new ForbiddenException(
        'A tarefa deve pertencer ao profissional autenticado',
      );
    }
  }

  private assertClinicalProfessional(user: AuthUser): void {
    if (!CLINICAL_PROFESSIONAL_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Acesso permitido somente a profissional clínico',
      );
    }
  }
}
