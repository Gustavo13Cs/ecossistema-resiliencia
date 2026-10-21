import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto';
import { ExerciseLibraryQueryDto } from './dto/exercise-library-query.dto';
import {
  ExerciseLibraryItem,
  ExerciseLibraryDetail,
  SAFEMOVE_EXERCISE_CATALOG,
  normalizeExerciseName,
} from './exercise-catalog';

import { UpdateExerciseVideoDto } from './dto/update-exercise-video.dto';
import { normalizeExerciseVideoUrl } from './exercise-video-url';
import {
  findCatalogDemonstration,
  isApprovedDemonstrationAsset,
} from './exercise-demonstration';

const customExerciseSelect = {
  id: true,
  name: true,
  muscleGroup: true,
  equipment: true,
  notes: true,
  videoUrl: true,
  mediaVersion: true,
} satisfies Prisma.CustomExerciseSelect;

type CustomExerciseRow = Prisma.CustomExerciseGetPayload<{
  select: typeof customExerciseSelect;
}>;

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
      ...(query.equipment ? { equipment: query.equipment } : {}),
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
      if (query.equipment && entry.equipment !== query.equipment) return false;
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
      ...customRows.map((row) => this.customItem(row)),
      ...catalogRows.map((entry) => {
        const detail = this.catalogDetail(entry.id);
        return {
          id: detail.id,
          name: detail.name,
          muscleGroup: detail.muscleGroup,
          equipment: detail.equipment,
          notes: detail.notes,
          source: detail.source,
          hasDemonstration: detail.hasDemonstration,
          demonstrationTypes: detail.demonstrationTypes,
        };
      }),
    ];
  }

  async get(
    user: AuthUser,
    exerciseId: string,
  ): Promise<ExerciseLibraryDetail> {
    this.assertTrainingProfessional(user);
    if (/^cat-[a-z]+-[0-9]{2}$/.test(exerciseId))
      return this.catalogDetail(exerciseId);
    this.assertCustomId(exerciseId);
    const row = await this.prisma.customExercise.findFirst({
      where: { id: exerciseId, professionalId: user.sub },
      select: customExerciseSelect,
    });
    if (!row)
      throw new NotFoundException('Exercício personalizado não encontrado.');
    return this.customDetail(row);
  }

  async updateVideo(
    user: AuthUser,
    id: string,
    dto: UpdateExerciseVideoDto,
  ): Promise<ExerciseLibraryDetail> {
    this.assertTrainingProfessional(user);
    this.assertCustomId(id);
    const videoUrl =
      dto.videoUrl === null ? null : normalizeExerciseVideoUrl(dto.videoUrl);
    // O filtro de versão e o incremento pertencem ao mesmo UPDATE, dentro da transação clínica.
    const result = await this.prisma.customExercise.updateMany({
      where: {
        id,
        professionalId: user.sub,
        mediaVersion: dto.expectedMediaVersion,
      },
      data: { videoUrl, mediaVersion: { increment: 1 } },
    });
    if (!result.count) {
      const existing = await this.prisma.customExercise.findFirst({
        where: { id, professionalId: user.sub },
        select: customExerciseSelect,
      });
      if (!existing)
        throw new NotFoundException('Exercício personalizado não encontrado.');
      throw new ConflictException(
        'O vídeo foi alterado. Atualize o exercício e tente novamente.',
      );
    }
    return this.get(user, id);
  }

  private assertCustomId(id: string) {
    if (!isUUID(id))
      throw new BadRequestException('Identificador de exercício inválido.');
  }

  private customItem(row: CustomExerciseRow): ExerciseLibraryItem {
    return {
      id: row.id,
      name: row.name,
      muscleGroup: row.muscleGroup,
      equipment: row.equipment,
      notes: row.notes,
      source: 'CUSTOM',
      hasDemonstration: !!row.videoUrl,
      demonstrationTypes: row.videoUrl ? ['VIDEO'] : [],
    };
  }

  private customDetail(row: CustomExerciseRow): ExerciseLibraryDetail {
    return {
      ...this.customItem(row),
      mediaVersion: row.mediaVersion,
      demonstration: row.videoUrl
        ? {
            revision: String(row.mediaVersion),
            instruction: row.notes ?? '',
            personalVideoUrl: row.videoUrl,
          }
        : null,
    };
  }

  private catalogDetail(id: string): ExerciseLibraryDetail {
    const entry = SAFEMOVE_EXERCISE_CATALOG.find((item) => item.id === id);
    if (!entry) throw new NotFoundException('Exercício não encontrado.');
    const snapshot = findCatalogDemonstration(id);
    const demonstration = snapshot
      ? {
          ...snapshot,
          assets: snapshot.assets?.map((asset) => ({
            ...asset,
            displayAllowed: isApprovedDemonstrationAsset(asset),
          })),
        }
      : null;
    const types = [
      ...new Set(
        demonstration?.assets
          ?.filter((asset) => asset.displayAllowed)
          .map((asset) => asset.type) ?? [],
      ),
    ];
    return {
      id: entry.id,
      name: entry.name,
      muscleGroup: entry.muscleGroup,
      equipment: entry.equipment,
      notes: entry.notes ?? null,
      source: 'CATALOG',
      mediaVersion: null,
      demonstration,
      hasDemonstration: types.length > 0,
      demonstrationTypes: types,
    };
  }

  async create(
    user: AuthUser,
    dto: CreateCustomExerciseDto,
  ): Promise<ExerciseLibraryItem> {
    this.assertTrainingProfessional(user);
    const trimmedName = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeExerciseName(trimmedName);
    const videoUrl =
      dto.videoUrl == null ? null : normalizeExerciseVideoUrl(dto.videoUrl);

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
          videoUrl,
          name: trimmedName,
          normalizedName,
          muscleGroup: dto.muscleGroup,
          equipment: dto.equipment ?? null,
          notes: dto.notes?.trim() ? dto.notes.trim() : null,
        },
        select: customExerciseSelect,
      });

      return this.customItem(created);
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
