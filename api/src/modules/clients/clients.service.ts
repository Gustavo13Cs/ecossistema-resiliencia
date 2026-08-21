import { ConflictException, Injectable } from '@nestjs/common';
import {
  Client,
  ClientAuditAction,
  ClientStatus,
  Prisma,
} from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeOptionalEmail = (email?: string): string | null => {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
};

const normalizeOptionalString = (value?: string | null): string | null =>
  value?.trim() || null;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, dto: CreateClientDto): Promise<Client> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const client = await tx.client.create({
          data: {
            professionalId: user.sub,
            name: dto.name.trim(),
            email: normalizeOptionalEmail(dto.email ?? undefined),
            phone: normalizeOptionalString(dto.phone),
            birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
            gender: normalizeOptionalString(dto.gender),
            goal: normalizeOptionalString(dto.goal),
            height: dto.height ?? null,
            initialWeight: dto.initialWeight ?? null,
            allergies: normalizeOptionalString(dto.allergies),
            pathologies: normalizeOptionalString(dto.pathologies),
            typicalSleep: normalizeOptionalString(dto.typicalSleep),
            stressLevel: dto.stressLevel ?? null,
            foodRelationship: normalizeOptionalString(dto.foodRelationship),
            psychologyHistory: normalizeOptionalString(dto.psychologyHistory),
            exerciseType: normalizeOptionalString(dto.exerciseType),
            exerciseFrequency: normalizeOptionalString(dto.exerciseFrequency),
            exerciseDuration: normalizeOptionalString(dto.exerciseDuration),
            hasPersonal: normalizeOptionalString(dto.hasPersonal),
            workActivityLevel: normalizeOptionalString(dto.workActivityLevel),
            professionalNotes: normalizeOptionalString(dto.professionalNotes),
            privacyNotes: normalizeOptionalString(dto.privacyNotes),
          },
        });
        await tx.clientAuditEvent.create({
          data: {
            clientId: client.id,
            professionalId: user.sub,
            action: ClientAuditAction.CREATED,
          },
        });
        return client;
      });
    } catch (error) {
      this.throwDuplicateEmailConflict(error);
    }
  }

  findAll(user: AuthUser, status: ClientStatus): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: { professionalId: user.sub, status },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findOne(user: AuthUser, clientId: string): Promise<Client> {
    return this.clientAccess.getOwnedClient(user, clientId);
  }

  async update(
    user: AuthUser,
    clientId: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    await this.clientAccess.getOwnedClient(user, clientId);
    const data = this.toUpdateData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const client = await tx.client.update({
          where: { id: clientId },
          data,
        });
        await tx.clientAuditEvent.create({
          data: {
            clientId,
            professionalId: user.sub,
            action: ClientAuditAction.UPDATED,
          },
        });
        return client;
      });
    } catch (error) {
      this.throwDuplicateEmailConflict(error);
    }
  }

  async setStatus(
    user: AuthUser,
    clientId: string,
    status: ClientStatus,
  ): Promise<Client> {
    await this.clientAccess.getOwnedClient(user, clientId);

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: clientId },
        data: { status },
      });
      await tx.clientAuditEvent.create({
        data: {
          clientId,
          professionalId: user.sub,
          action:
            status === ClientStatus.ACTIVE
              ? ClientAuditAction.RESTORED
              : ClientAuditAction.ARCHIVED,
        },
      });
      return client;
    });
  }

  private toUpdateData(dto: UpdateClientDto): Prisma.ClientUncheckedUpdateInput {
    return {
      name: hasOwn(dto, 'name') ? dto.name?.trim() : undefined,
      email: hasOwn(dto, 'email')
        ? normalizeOptionalEmail(dto.email ?? undefined)
        : undefined,
      phone: hasOwn(dto, 'phone') ? normalizeOptionalString(dto.phone) : undefined,
      birthDate: hasOwn(dto, 'birthDate')
        ? dto.birthDate
          ? new Date(dto.birthDate)
          : null
        : undefined,
      gender: hasOwn(dto, 'gender') ? normalizeOptionalString(dto.gender) : undefined,
      goal: hasOwn(dto, 'goal') ? normalizeOptionalString(dto.goal) : undefined,
      height: hasOwn(dto, 'height') ? dto.height ?? null : undefined,
      initialWeight: hasOwn(dto, 'initialWeight')
        ? dto.initialWeight ?? null
        : undefined,
      allergies: hasOwn(dto, 'allergies')
        ? normalizeOptionalString(dto.allergies)
        : undefined,
      pathologies: hasOwn(dto, 'pathologies')
        ? normalizeOptionalString(dto.pathologies)
        : undefined,
      typicalSleep: hasOwn(dto, 'typicalSleep')
        ? normalizeOptionalString(dto.typicalSleep)
        : undefined,
      stressLevel: hasOwn(dto, 'stressLevel') ? dto.stressLevel ?? null : undefined,
      foodRelationship: hasOwn(dto, 'foodRelationship')
        ? normalizeOptionalString(dto.foodRelationship)
        : undefined,
      psychologyHistory: hasOwn(dto, 'psychologyHistory')
        ? normalizeOptionalString(dto.psychologyHistory)
        : undefined,
      exerciseType: hasOwn(dto, 'exerciseType')
        ? normalizeOptionalString(dto.exerciseType)
        : undefined,
      exerciseFrequency: hasOwn(dto, 'exerciseFrequency')
        ? normalizeOptionalString(dto.exerciseFrequency)
        : undefined,
      exerciseDuration: hasOwn(dto, 'exerciseDuration')
        ? normalizeOptionalString(dto.exerciseDuration)
        : undefined,
      hasPersonal: hasOwn(dto, 'hasPersonal')
        ? normalizeOptionalString(dto.hasPersonal)
        : undefined,
      workActivityLevel: hasOwn(dto, 'workActivityLevel')
        ? normalizeOptionalString(dto.workActivityLevel)
        : undefined,
      professionalNotes: hasOwn(dto, 'professionalNotes')
        ? normalizeOptionalString(dto.professionalNotes)
        : undefined,
      privacyNotes: hasOwn(dto, 'privacyNotes')
        ? normalizeOptionalString(dto.privacyNotes)
        : undefined,
    };
  }

  private throwDuplicateEmailConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('E-mail já cadastrado para este profissional');
    }

    throw error;
  }
}
