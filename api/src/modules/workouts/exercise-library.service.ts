import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto';
import { ExerciseLibraryQueryDto } from './dto/exercise-library-query.dto';
import {
  ExerciseLibraryItem,
  SAFEMOVE_EXERCISE_CATALOG,
  normalizeExerciseName,
} from './exercise-catalog';

const customExerciseSelect = {
  id: true,
  name: true,
  muscleGroup: true,
  equipment: true,
  notes: true,
} satisfies Prisma.CustomExerciseSelect;

@Injectable()
export class ExerciseLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthUser,
    query: ExerciseLibraryQueryDto = {},
  ): Promise<ExerciseLibraryItem[]> {
    this.assertTrainingProfessional(user);
    const normalizedQuery = query.q ? normalizeExerciseName(query.q) : '';

    const where: Prisma.CustomExerciseWhereInput = {
      professionalId: user.sub,
      ...(query.muscleGroup ? { muscleGroup: query.muscleGroup } : {}),
      ...(normalizedQuery
        ? { normalizedName: { contains: normalizedQuery } }
        : {}),
    };

    const customRows = await this.prisma.customExercise.findMany({
      where,
      select: customExerciseSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    const catalogRows = SAFEMOVE_EXERCISE_CATALOG.filter((entry) => {
      if (query.muscleGroup && entry.muscleGroup !== query.muscleGroup) {
        return false;
      }
      if (
        normalizedQuery &&
        !normalizeExerciseName(entry.name).includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });

    return [
      ...customRows.map((row) => ({
        id: row.id,
        name: row.name,
        muscleGroup: row.muscleGroup,
        equipment: row.equipment,
        notes: row.notes,
        source: 'CUSTOM' as const,
      })),
      ...catalogRows.map((entry) => ({
        id: entry.id,
        name: entry.name,
        muscleGroup: entry.muscleGroup,
        equipment: entry.equipment,
        notes: entry.notes ?? null,
        source: 'CATALOG' as const,
      })),
    ];
  }

  async create(
    user: AuthUser,
    dto: CreateCustomExerciseDto,
  ): Promise<ExerciseLibraryItem> {
    this.assertTrainingProfessional(user);
    const trimmedName = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeExerciseName(trimmedName);

    if (trimmedName.length < 2 || !normalizedName) {
      throw new BadRequestException('Informe um nome válido para o exercício.');
    }

    const duplicate = await this.prisma.customExercise.findFirst({
      where: {
        professionalId: user.sub,
        normalizedName,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'Você já cadastrou um exercício com este nome.',
      );
    }

    try {
      const created = await this.prisma.customExercise.create({
        data: {
          professionalId: user.sub,
          name: trimmedName,
          normalizedName,
          muscleGroup: dto.muscleGroup,
          equipment: dto.equipment ?? null,
          notes: dto.notes?.trim() ? dto.notes.trim() : null,
        },
        select: customExerciseSelect,
      });

      return {
        id: created.id,
        name: created.name,
        muscleGroup: created.muscleGroup,
        equipment: created.equipment,
        notes: created.notes,
        source: 'CUSTOM',
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Você já cadastrou um exercício com este nome.',
        );
      }
      throw error;
    }
  }

  async remove(user: AuthUser, id: string): Promise<{ id: string }> {
    this.assertTrainingProfessional(user);
    const existing = await this.prisma.customExercise.findFirst({
      where: { id, professionalId: user.sub },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Exercício personalizado não encontrado.');
    }

    await this.prisma.customExercise.delete({
      where: { id: existing.id },
    });

    return { id: existing.id };
  }

  private assertTrainingProfessional(user: AuthUser) {
    if (user.role !== 'PERSONAL') {
      throw new ForbiddenException(
        'Acesso permitido somente a personal trainer',
      );
    }
  }
}
