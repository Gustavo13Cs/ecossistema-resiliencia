import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthUser } from '../../common/types/auth-user';
import { SAFEMOVE_EXERCISE_CATALOG } from './exercise-catalog';
import { findCatalogDemonstration } from './exercise-demonstration';
import {
  DemonstrationSnapshot,
  LibraryReference,
} from './exercise-demonstration.types';
import { DraftContentInput, DraftContentV2 } from './workout-draft.types';

const customDemonstrationSelect = {
  videoUrl: true,
  notes: true,
  mediaVersion: true,
} satisfies Prisma.CustomExerciseSelect;
type CustomDemonstrationRow = Prisma.CustomExerciseGetPayload<{
  select: typeof customDemonstrationSelect;
}>;
type CustomDemonstrationLookup = (
  exerciseId: string,
) => Promise<CustomDemonstrationRow | null | undefined>;

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
    return this.resolveReference(user, reference, reusable, (exerciseId) =>
      this.prisma.customExercise.findFirst({
        where: { id: exerciseId, professionalId: user.sub },
        select: customDemonstrationSelect,
      }),
    );
  }
  private reusableDemonstration(
    reference: LibraryReference,
    reusable: readonly AuthorizedDemonstration[],
  ): AuthorizedDemonstration | undefined {
    return reusable.find(
      (saved) =>
        saved.reference.source === reference.source &&
        saved.reference.exerciseId === reference.exerciseId &&
        saved.reference.demonstrationRevision ===
          reference.demonstrationRevision,
    );
  }
  private async resolveReference(
    user: AuthUser,
    reference: LibraryReference,
    reusable: readonly AuthorizedDemonstration[],
    customLookup: CustomDemonstrationLookup,
  ): Promise<DemonstrationSnapshot | null> {
    if (user.role !== 'PERSONAL') throw new ForbiddenException();
    const previous = this.reusableDemonstration(reference, reusable);
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
      const item = await customLookup(reference.exerciseId);
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
      throw new ConflictException({
        code: 'DEMONSTRATION_SELECTION_STALE',
        message:
          'A demonstração foi alterada. Atualize a seleção ou retire a referência.',
      });
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
    const customIds = [
      ...new Set(
        content.splits.flatMap((split) =>
          split.exercises.flatMap(({ libraryReference: reference }) =>
            reference?.source === 'CUSTOM' &&
            isUUID(reference.exerciseId) &&
            !this.reusableDemonstration(reference, reusable)
              ? [reference.exerciseId]
              : [],
          ),
        ),
      ),
    ];
    let customRows: Promise<Map<string, CustomDemonstrationRow>> | undefined;
    const customLookup: CustomDemonstrationLookup = async (exerciseId) => {
      // A consulta começa na primeira seleção válida, preservando os erros anteriores.
      customRows ??= this.prisma.customExercise
        .findMany({
          where: { professionalId: user.sub, id: { in: customIds } },
          select: { id: true, ...customDemonstrationSelect },
        })
        .then((rows) => new Map(rows.map((row) => [row.id, row])));
      return (await customRows).get(exerciseId);
    };
    const splits: ResolvedWorkoutDemonstrations['splits'] = [];
    for (const split of content.splits) {
      const exercises: ResolvedWorkoutDemonstrations['splits'][number]['exercises'] =
        [];
      for (const exercise of split.exercises) {
        const libraryReference = exercise.libraryReference ?? null;
        exercises.push({
          libraryReference,
          demonstrationSnapshot: libraryReference
            ? await this.resolveReference(
                user,
                libraryReference,
                reusable,
                customLookup,
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
