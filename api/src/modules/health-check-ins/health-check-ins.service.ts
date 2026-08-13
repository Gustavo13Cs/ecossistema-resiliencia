import { BadRequestException, Injectable } from '@nestjs/common';
import { HealthCheckIn, Prisma } from '@prisma/client';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { ConsentsService } from '../consents/consents.service';
import { CreateHealthCheckInDto } from './dto/create-health-check-in.dto';

const MAX_RANGE_MILLISECONDS = 31 * 24 * 60 * 60 * 1000;

export type HealthCheckInRange = {
  from: Date;
  to: Date;
};

@Injectable()
export class HealthCheckInsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
    private readonly consents: ConsentsService,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateHealthCheckInDto,
  ): Promise<HealthCheckIn> {
    this.patientAccess.assertPatientSelf(user, user.sub);

    const symptoms = dto.symptoms?.trim();
    const notes = dto.notes?.trim();
    const hasHealthData =
      dto.waterMl !== undefined ||
      dto.painLevel !== undefined ||
      dto.mood !== undefined ||
      Boolean(symptoms) ||
      Boolean(notes);

    if (!hasHealthData) {
      throw new BadRequestException(
        'Informe ao menos um dado para registrar o check-in',
      );
    }

    const data: Prisma.HealthCheckInUncheckedCreateInput = {
      patientId: user.sub,
    };
    if (dto.waterMl !== undefined) data.waterMl = dto.waterMl;
    if (dto.painLevel !== undefined) data.painLevel = dto.painLevel;
    if (dto.mood !== undefined) data.mood = dto.mood;
    if (symptoms) data.symptoms = symptoms;
    if (notes) data.notes = notes;
    if (dto.recordedAt !== undefined) {
      data.recordedAt = new Date(dto.recordedAt);
    }

    return this.prisma.healthCheckIn.create({ data });
  }

  async listForPatient(
    user: AuthUser,
    patientId: string,
    range: HealthCheckInRange,
  ): Promise<HealthCheckIn[]> {
    assertRange(range);

    if (user.role === 'PATIENT') {
      this.patientAccess.assertPatientSelf(user, patientId);
    } else {
      await this.patientAccess.assertProfessionalLink(user, patientId);
      await this.consents.assertGranted(patientId, user.sub, 'HEALTH_CHECK_IN');
    }

    return this.prisma.healthCheckIn.findMany({
      where: {
        patientId,
        recordedAt: { gte: range.from, lte: range.to },
      },
      orderBy: { recordedAt: 'desc' },
    });
  }
}

function assertRange(range: HealthCheckInRange): void {
  const fromTime =
    range.from instanceof Date ? range.from.getTime() : Number.NaN;
  const toTime = range.to instanceof Date ? range.to.getTime() : Number.NaN;

  if (
    !Number.isFinite(fromTime) ||
    !Number.isFinite(toTime) ||
    toTime < fromTime ||
    toTime - fromTime > MAX_RANGE_MILLISECONDS
  ) {
    throw new BadRequestException(
      'Intervalo deve ser válido e ter no máximo 31 dias',
    );
  }
}
