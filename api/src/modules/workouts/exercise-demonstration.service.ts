import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthUser } from '../../common/types/auth-user';
import { SAFEMOVE_EXERCISE_CATALOG } from './exercise-catalog';
import { findCatalogDemonstration } from './exercise-demonstration';
import {
  DemonstrationSnapshot,
  LibraryReference,
} from './exercise-demonstration.types';
import { DraftContentInput, DraftContentV2 } from './workout-draft.types';

/** Construído exclusivamente a partir de linhas persistidas já autorizadas. */
export interface AuthorizedDemonstration {
  reference: LibraryReference;
  snapshot: DemonstrationSnapshot | null;
}
export type ResolvedWorkoutDemonstrations = {
  splits: {
    exercises: {
      libraryReference: LibraryReference | null;
      demonstrationSnapshot: DemonstrationSnapshot | null;
    }[];
  }[];
};
@Injectable()
export class ExerciseDemonstrationService {
  constructor(private readonly prisma: PrismaService) {}
  async resolveDemonstrationReference(
    user: AuthUser,
    reference: LibraryReference,
    reusable: readonly AuthorizedDemonstration[],
  ): Promise<DemonstrationSnapshot | null> {
    if (user.role !== 'PERSONAL') throw new ForbiddenException();
    const previous = reusable.find(
      (saved) =>
        saved.reference.source === reference.source &&
        saved.reference.exerciseId === reference.exerciseId &&
        saved.reference.demonstrationRevision ===
          reference.demonstrationRevision,
    );
    if (previous) return structuredClone(previous.snapshot);
    let snapshot: DemonstrationSnapshot | null;
    if (reference.source === 'CATALOG') {
      if (
        !SAFEMOVE_EXERCISE_CATALOG.some(
          (item) => item.id === reference.exerciseId,
        )
      )
        throw new NotFoundException('Exercício não encontrado.');
      snapshot = findCatalogDemonstration(reference.exerciseId);
    } else if (reference.source === 'CUSTOM') {
      if (!isUUID(reference.exerciseId))
        throw new BadRequestException('Identificador de exercício inválido.');
      const item = await this.prisma.customExercise.findFirst({
        where: { id: reference.exerciseId, professionalId: user.sub },
        select: { videoUrl: true, notes: true, mediaVersion: true },
      });
      if (!item) throw new NotFoundException('Exercício não encontrado.');
      snapshot = item.videoUrl
        ? {
            revision: String(item.mediaVersion),
            instruction: item.notes ?? '',
            personalVideoUrl: item.videoUrl,
          }
        : null;
    } else throw new BadRequestException('Referência inválida.');
    if ((snapshot?.revision ?? null) !== reference.demonstrationRevision)
      throw new ConflictException(
        'A demonstração foi alterada. Atualize a seleção ou retire a referência.',
      );
    return snapshot;
  }
  async resolveWorkoutDemonstrations(
    user: AuthUser,
    content: {
      splits: readonly {
        exercises: readonly { libraryReference?: LibraryReference | null }[];
      }[];
    },
    reusable: readonly AuthorizedDemonstration[] = [],
  ): Promise<ResolvedWorkoutDemonstrations> {
    const splits: ResolvedWorkoutDemonstrations['splits'] = [];
    for (const split of content.splits) {
      const exercises: ResolvedWorkoutDemonstrations['splits'][number]['exercises'] =
        [];
      for (const exercise of split.exercises) {
        const libraryReference = exercise.libraryReference ?? null;
        exercises.push({
          libraryReference,
          demonstrationSnapshot: libraryReference
            ? await this.resolveDemonstrationReference(
                user,
                libraryReference,
                reusable,
              )
            : null,
        });
      }
      splits.push({ exercises });
    }
    return { splits };
  }
  async resolveContent(
    user: AuthUser,
    content: DraftContentInput,
    reusable: readonly AuthorizedDemonstration[] = [],
  ): Promise<DraftContentV2> {
    const resolved = await this.resolveWorkoutDemonstrations(
      user,
      content,
      reusable,
    );
    return {
      ...content,
      splits: content.splits.map((split, splitIndex) => ({
        ...split,
        exercises: split.exercises.map((exercise, exerciseIndex) => ({
          ...exercise,
          ...resolved.splits[splitIndex].exercises[exerciseIndex],
        })),
      })),
    };
  }
}
export function authorizedDemonstrations(
  content: DraftContentV2,
): AuthorizedDemonstration[] {
  return content.splits.flatMap((split) =>
    split.exercises.flatMap((exercise) =>
      exercise.libraryReference
        ? [
            {
              reference: exercise.libraryReference,
              snapshot: exercise.demonstrationSnapshot,
            },
          ]
        : [],
    ),
  );
}
