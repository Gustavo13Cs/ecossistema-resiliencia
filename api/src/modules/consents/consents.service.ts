import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConsentCategory, Role } from '@prisma/client';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import {
  AuthUser,
  CLINICAL_PROFESSIONAL_ROLES,
} from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { UpdateConsentDto } from './dto/update-consent.dto';

const CONSENT_CATEGORIES: ConsentCategory[] = [
  'GENERAL',
  'NUTRITION',
  'TRAINING',
  'REHABILITATION',
  'HEALTH_CHECK_IN',
];

export type ConsentView = {
  professional: { id: string; name: string; role: Role };
  category: ConsentCategory;
  granted: boolean;
  updatedAt: Date | null;
};

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
  ) {}

  async listMine(user: AuthUser): Promise<ConsentView[]> {
    this.patientAccess.assertPatientSelf(user, user.sub);

    const links = await this.prisma.professionalPatientLink.findMany({
      where: {
        patientId: user.sub,
        isActive: true,
        professional: {
          role: { in: CLINICAL_PROFESSIONAL_ROLES },
        },
      },
      select: {
        professionalId: true,
        professional: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (links.length === 0) {
      return [];
    }

    const consents = await this.prisma.patientConsent.findMany({
      where: {
        patientId: user.sub,
        professionalId: { in: links.map((link) => link.professionalId) },
      },
      select: {
        professionalId: true,
        dataCategory: true,
        granted: true,
        updatedAt: true,
      },
    });

    return links.flatMap((link) =>
      CONSENT_CATEGORIES.map((category) => {
        const consent = consents.find(
          (candidate) =>
            candidate.professionalId === link.professionalId &&
            candidate.dataCategory === category,
        );

        return {
          professional: link.professional,
          category,
          granted: consent?.granted ?? false,
          updatedAt: consent?.updatedAt ?? null,
        };
      }),
    );
  }

  async setMine(
    user: AuthUser,
    professionalId: string,
    category: ConsentCategory,
    dto: UpdateConsentDto,
  ) {
    this.patientAccess.assertPatientSelf(user, user.sub);
    await this.assertActiveClinicalLink(user.sub, professionalId);

    const now = new Date();
    const timestamps = dto.granted
      ? { grantedAt: now, revokedAt: null }
      : { grantedAt: null, revokedAt: now };

    return this.prisma.patientConsent.upsert({
      where: {
        patientId_professionalId_dataCategory: {
          patientId: user.sub,
          professionalId,
          dataCategory: category,
        },
      },
      create: {
        patientId: user.sub,
        professionalId,
        dataCategory: category,
        granted: dto.granted,
        ...timestamps,
      },
      update: {
        granted: dto.granted,
        ...timestamps,
      },
    });
  }

  async assertGranted(
    patientId: string,
    professionalId: string,
    category: ConsentCategory,
  ): Promise<void> {
    const consent = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_professionalId_dataCategory: {
          patientId,
          professionalId,
          dataCategory: category,
        },
      },
    });

    if (!consent?.granted) {
      throw new ForbiddenException('Paciente não concedeu acesso a estes dados');
    }
  }

  private async assertActiveClinicalLink(
    patientId: string,
    professionalId: string,
  ): Promise<void> {
    const link = await this.prisma.professionalPatientLink.findFirst({
      where: {
        patientId,
        professionalId,
        isActive: true,
        professional: {
          role: { in: CLINICAL_PROFESSIONAL_ROLES },
        },
      },
    });

    if (!link) {
      throw new ForbiddenException('Profissional sem vínculo clínico ativo');
    }
  }
}
