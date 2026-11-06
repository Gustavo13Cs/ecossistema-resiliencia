import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkoutTemplate } from '@prisma/client';
import { isUUID } from 'class-validator';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockOwnedClient } from '../../common/client-access/lock-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreateStandaloneWorkoutTemplateDto,
  CreateWorkoutTemplateDto,
  DuplicateWorkoutTemplateDto,
  ImportWorkoutTemplateDto,
  UpdateWorkoutTemplateDto,
  WorkoutTemplateQueryDto,
} from './dto/workout-template.dto';
import { storedExerciseDemonstration } from './exercise-demonstration';
import { ExerciseLibraryService } from './exercise-library.service';
import {
  assertDraftContentSize,
  normalizeDraftContent,
} from './workout-draft-content';
import { DraftContentInput } from './workout-draft.types';
import { WorkoutDraftsService } from './workout-drafts.service';
import { Periodization, SecondaryMuscle } from './workout-p3.types';

const TEMPLATE_GOAL_LABELS: Readonly<Record<string, string>> = {
  MUSCLE_GAIN: 'Hipertrofia',
  STRENGTH: 'Força',
  WEIGHT_LOSS: 'Emagrecimento',
  CONDITIONING: 'Condicionamento',
};

const metadataSelect = {
  id: true,
  professionalId: true,
  title: true,
  description: true,
  goal: true,
  level: true,
  targetAudience: true,
  environment: true,
  estimatedWeeks: true,
  schemaVersion: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkoutTemplateSelect;

type MetadataRow = Omit<WorkoutTemplate, 'content'>;

@Injectable()
export class WorkoutTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
    private readonly drafts: WorkoutDraftsService,
    private readonly library: ExerciseLibraryService,
  ) {}

  async list(user: AuthUser, query: WorkoutTemplateQueryDto = {}) {
    this.assertPersonal(user);
    const limit = query.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 20)
      throw new BadRequestException('Limite inválido.');

    const status = query.status ?? 'active';
    if (status === 'archived' && query.origin === 'global') {
      return { items: [], nextCursor: null };
    }

    const andConditions: Prisma.WorkoutTemplateWhereInput[] = [];

    if (status === 'archived') {
      andConditions.push({
        professionalId: user.sub,
        archivedAt: { not: null },
      });
    } else {
      if (query.origin === 'global') {
        andConditions.push({ professionalId: null });
      } else if (query.origin === 'private') {
        andConditions.push({ professionalId: user.sub });
      } else {
        andConditions.push({
          OR: [{ professionalId: user.sub }, { professionalId: null }],
        });
      }
      if (status === 'active') {
        andConditions.push({ archivedAt: null });
      }
    }

    if (query.goal) andConditions.push({ goal: query.goal });
    if (query.level) andConditions.push({ level: query.level });
    if (query.environment) {
      andConditions.push({ environment: query.environment });
    }
    const trimmedSearch = query.q?.trim();
    if (trimmedSearch) {
      andConditions.push({
        OR: [
          { title: { contains: trimmedSearch, mode: 'insensitive' } },
          { description: { contains: trimmedSearch, mode: 'insensitive' } },
        ],
      });
    }

    const baseWhere: Prisma.WorkoutTemplateWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    let cursor: { createdAt: string; id: string } | null = null;
    if (query.cursor !== undefined) {
      try {
        const raw = Buffer.from(query.cursor, 'base64url').toString('utf8');
        cursor = JSON.parse(raw) as { createdAt: string; id: string };
        if (
          !cursor ||
          !isUUID(cursor.id) ||
          new Date(cursor.createdAt).toISOString() !== cursor.createdAt ||
          JSON.stringify({ createdAt: cursor.createdAt, id: cursor.id }) !==
            raw ||
          Buffer.from(raw).toString('base64url') !== query.cursor
        )
          throw new Error();
      } catch {
        throw new BadRequestException('Cursor de modelos inválido.');
      }
      const anchor = await this.prisma.workoutTemplate.findFirst({
        where: {
          AND: [
            baseWhere,
            { id: cursor.id, createdAt: new Date(cursor.createdAt) },
          ],
        },
        select: { id: true },
      });
      if (!anchor) throw new BadRequestException('Cursor de modelos inválido.');
    }

    const rows = await this.prisma.workoutTemplate.findMany({
      where: cursor
        ? {
            AND: [
              baseWhere,
              {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  {
                    createdAt: new Date(cursor.createdAt),
                    id: { gt: cursor.id },
                  },
                ],
              },
            ],
          }
        : baseWhere,
      select: metadataSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit).map((row) => this.metadata(row));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(
              JSON.stringify({
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
    };
  }

  async get(user: AuthUser, id: string) {
    const row = await this.authorized(user, id);
    return { ...this.metadata(row), content: this.content(row) };
  }

  async create(user: AuthUser, dto: CreateStandaloneWorkoutTemplateDto) {
    this.assertPersonal(user);
    const content = this.sanitizeTemplateContent(
      dto.title,
      dto.goal,
      dto.content as unknown as DraftContentInput,
    );
    this.assertNonEmptyTemplateStructure(content);
    await this.refreshReferences(user, content);
    assertDraftContentSize(content);

    const estimatedWeeks =
      content.durationWeeks ??
      content.periodization?.phases.at(-1)?.endWeek ??
      8;

    const row = await this.prisma.workoutTemplate.create({
      data: {
        professionalId: user.sub,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        goal: dto.goal,
        level: dto.level,
        targetAudience: dto.targetAudience?.trim() || null,
        environment: dto.environment ?? null,
        estimatedWeeks,
        schemaVersion: 3,
        content: content as unknown as Prisma.InputJsonValue,
      },
    });
    return { ...this.metadata(row), content };
  }

  async update(user: AuthUser, id: string, dto: UpdateWorkoutTemplateDto) {
    const existing = await this.ownedPrivate(user, id);
    const nextTitle =
      dto.title !== undefined ? dto.title.trim() : existing.title;
    const nextGoal = dto.goal ?? existing.goal;
    const nextLevel = dto.level ?? existing.level;
    const nextDescription =
      dto.description !== undefined
        ? dto.description?.trim() || null
        : existing.description;
    const nextAudience =
      dto.targetAudience !== undefined
        ? dto.targetAudience?.trim() || null
        : existing.targetAudience;
    const nextEnvironment =
      dto.environment !== undefined ? dto.environment : existing.environment;

    let nextContent: DraftContentInput;
    if (dto.content !== undefined) {
      nextContent = this.sanitizeTemplateContent(
        nextTitle,
        nextGoal,
        dto.content as unknown as DraftContentInput,
      );
      this.assertNonEmptyTemplateStructure(nextContent);
      await this.refreshReferences(user, nextContent);
    } else {
      nextContent = normalizeDraftContent({
        ...this.content(existing),
        title: nextTitle,
        goal: nextGoal,
      });
    }
    assertDraftContentSize(nextContent);

    const nextEstimatedWeeks =
      dto.content !== undefined
        ? (nextContent.durationWeeks ??
          nextContent.periodization?.phases.at(-1)?.endWeek ??
          8)
        : existing.estimatedWeeks;

    const updated = await this.prisma.workoutTemplate.update({
      where: { id: existing.id },
      data: {
        title: nextTitle,
        description: nextDescription,
        goal: nextGoal,
        level: nextLevel,
        targetAudience: nextAudience,
        environment: nextEnvironment,
        estimatedWeeks: nextEstimatedWeeks,
        content: nextContent as unknown as Prisma.InputJsonValue,
      },
    });
    return { ...this.metadata(updated), content: nextContent };
  }

  async duplicate(
    user: AuthUser,
    id: string,
    dto: DuplicateWorkoutTemplateDto = {},
  ) {
    const source = await this.authorized(user, id);
    const nextTitle = (dto.title?.trim() || `Cópia de ${source.title}`).slice(
      0,
      200,
    );
    const content = this.sanitizeTemplateContent(
      nextTitle,
      source.goal,
      this.content(source),
    );
    await this.refreshReferences(user, content);
    assertDraftContentSize(content);

    const created = await this.prisma.workoutTemplate.create({
      data: {
        professionalId: user.sub,
        title: nextTitle,
        description: source.description,
        goal: source.goal,
        level: source.level,
        targetAudience: source.targetAudience,
        environment: source.environment,
        estimatedWeeks: source.estimatedWeeks,
        schemaVersion: 3,
        archivedAt: null,
        content: content as unknown as Prisma.InputJsonValue,
      },
    });
    return { ...this.metadata(created), content };
  }

  async archive(user: AuthUser, id: string) {
    const existing = await this.ownedPrivate(user, id);
    const updated = await this.prisma.workoutTemplate.update({
      where: { id: existing.id },
      data: { archivedAt: existing.archivedAt ?? new Date() },
      select: metadataSelect,
    });
    return this.metadata(updated);
  }

  async restore(user: AuthUser, id: string) {
    const existing = await this.ownedPrivate(user, id);
    const updated = await this.prisma.workoutTemplate.update({
      where: { id: existing.id },
      data: { archivedAt: null },
      select: metadataSelect,
    });
    return this.metadata(updated);
  }

  async fromWorkout(
    user: AuthUser,
    workoutId: string,
    dto: CreateWorkoutTemplateDto,
  ) {
    this.assertPersonal(user);
    const source = await this.prisma.workout.findFirst({
      where: {
        id: workoutId,
        creatorId: user.sub,
        finalizedAt: { not: null },
        client: { professionalId: user.sub },
      },
      select: { clientId: true },
    });
    if (!source?.clientId)
      throw new NotFoundException('Ficha finalizada não encontrada.');
    await this.access.getOwnedClient(user, source.clientId);
    return this.prisma.$transaction(async (tx) => {
      await lockOwnedClient(tx, source.clientId!, user.sub);
      const client = await tx.client.findFirst({
        where: { id: source.clientId!, professionalId: user.sub },
        select: { status: true },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado.');
      if (client.status === 'ARCHIVED')
        throw new ConflictException({
          code: 'CLIENT_ARCHIVED',
          message: 'Aluno arquivado não permite criar modelos.',
        });
      const workout = await tx.workout.findFirst({
        where: {
          id: workoutId,
          creatorId: user.sub,
          clientId: source.clientId,
          finalizedAt: { not: null },
          client: { professionalId: user.sub },
        },
        include: {
          splits: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: {
              exercises: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
            },
          },
        },
      });
      if (!workout)
        throw new NotFoundException('Ficha finalizada não encontrada.');
      const content = normalizeDraftContent({
        title: dto.title,
        goal: dto.goal,
        notes: '',
        durationWeeks: workout.durationWeeks,
        ...(workout.periodization
          ? {
              periodization: {
                ...(workout.periodization as unknown as Periodization),
                startsOn: '',
              },
            }
          : {}),
        splits: workout.splits.map((split) => ({
          name: split.name,
          focus: '',
          ...(split.weeklyFrequency != null
            ? { weeklyFrequency: split.weeklyFrequency }
            : {}),
          exercises: split.exercises.map((exercise) => ({
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest: exercise.rest ?? '',
            notes: '',
            load: '',
            muscleGroup: exercise.muscleGroup,
            effortType: exercise.effortType,
            effortTarget: exercise.effortTarget ?? '',
            tempo: exercise.tempo ?? '',
            method: exercise.method,
            ...(exercise.secondaryMuscles
              ? {
                  secondaryMuscles:
                    exercise.secondaryMuscles as unknown as SecondaryMuscle[],
                }
              : {}),
            libraryReference:
              storedExerciseDemonstration(exercise).libraryReference,
          })),
        })),
      });
      await this.refreshReferences(user, content);
      assertDraftContentSize(content);
      const row = await tx.workoutTemplate.create({
        data: {
          professionalId: user.sub,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          goal: dto.goal,
          level: dto.level,
          targetAudience: dto.targetAudience?.trim() || null,
          environment: dto.environment ?? null,
          estimatedWeeks: workout.durationWeeks ?? 8,
          schemaVersion: 3,
          content: content as unknown as Prisma.InputJsonValue,
        },
      });
      return {
        clientId: source.clientId,
        template: { ...this.metadata(row), content },
      };
    });
  }

  async createDraft(user: AuthUser, id: string, dto: ImportWorkoutTemplateDto) {
    const row = await this.authorized(user, id);
    if (row.archivedAt !== null) {
      throw new ConflictException({
        code: 'TEMPLATE_ARCHIVED',
        message: 'Restaure o modelo arquivado antes de aplicá-lo a um aluno.',
      });
    }
    const content = {
      ...this.content(row),
      goal: TEMPLATE_GOAL_LABELS[row.goal],
    };
    await this.refreshReferences(user, content);
    return this.drafts.create(user, { clientId: dto.clientId, content });
  }

  private sanitizeTemplateContent(
    title: string,
    goal: string,
    raw: DraftContentInput,
  ): DraftContentInput {
    const normalized = normalizeDraftContent(structuredClone(raw));
    return normalizeDraftContent({
      title: title.trim(),
      goal,
      notes: '',
      durationWeeks: normalized.durationWeeks,
      ...(normalized.periodization
        ? {
            periodization: {
              ...normalized.periodization,
              startsOn: '',
            },
          }
        : {}),
      splits: normalized.splits.map((split) => ({
        name: split.name,
        focus: '',
        ...(split.weeklyFrequency != null
          ? { weeklyFrequency: split.weeklyFrequency }
          : {}),
        exercises: split.exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          notes: '',
          load: '',
          muscleGroup: exercise.muscleGroup,
          effortType: exercise.effortType,
          effortTarget: exercise.effortTarget,
          tempo: exercise.tempo,
          method: exercise.method,
          ...(exercise.secondaryMuscles
            ? { secondaryMuscles: exercise.secondaryMuscles }
            : {}),
          libraryReference: exercise.libraryReference ?? null,
        })),
      })),
    });
  }

  private assertNonEmptyTemplateStructure(content: DraftContentInput) {
    if (content.splits.length === 0) {
      throw new BadRequestException(
        'Adicione ao menos uma divisão ao modelo de treino.',
      );
    }
    for (const split of content.splits) {
      if (!split.name.trim()) {
        throw new BadRequestException(
          'Informe o nome de todas as divisões do modelo.',
        );
      }
      if (split.exercises.length === 0) {
        throw new BadRequestException(
          'Cada divisão do modelo precisa ter ao menos um exercício.',
        );
      }
      for (const exercise of split.exercises) {
        if (!exercise.name.trim()) {
          throw new BadRequestException(
            'Informe o nome de todos os exercícios do modelo.',
          );
        }
      }
    }
  }

  private async refreshReferences(user: AuthUser, content: DraftContentInput) {
    for (const exercise of content.splits.flatMap((split) => split.exercises)) {
      if (!exercise.libraryReference) continue;
      try {
        const item = await this.library.get(
          user,
          exercise.libraryReference.exerciseId,
        );
        if (item.source !== exercise.libraryReference.source)
          throw new NotFoundException();
        exercise.libraryReference.demonstrationRevision =
          item.demonstration?.revision ?? null;
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
        throw new ConflictException({
          code: 'TEMPLATE_REFERENCE_UNAVAILABLE',
          message:
            'Um exercício do modelo não está mais disponível. Revise o modelo antes de importar.',
        });
      }
    }
  }

  private content(row: WorkoutTemplate): DraftContentInput {
    if (row.schemaVersion !== 3)
      throw new ConflictException('Versão de modelo não suportada.');
    const content = normalizeDraftContent(
      structuredClone(row.content) as unknown as DraftContentInput,
    );
    assertDraftContentSize(content);
    return content;
  }

  private async authorized(user: AuthUser, id: string) {
    this.assertPersonal(user);
    const row = await this.prisma.workoutTemplate.findFirst({
      where: {
        id,
        OR: [{ professionalId: user.sub }, { professionalId: null }],
      },
    });
    if (!row) throw new NotFoundException('Modelo não encontrado.');
    return row;
  }

  private async ownedPrivate(user: AuthUser, id: string) {
    this.assertPersonal(user);
    const row = await this.prisma.workoutTemplate.findFirst({
      where: {
        id,
        professionalId: user.sub,
      },
    });
    if (!row) throw new NotFoundException('Modelo não encontrado.');
    return row;
  }

  private metadata(row: MetadataRow) {
    const { professionalId, ...metadata } = row;
    // Projeção explícita: JSON e identidade do proprietário nunca integram a página.
    return {
      id: metadata.id,
      title: metadata.title,
      description: metadata.description,
      goal: metadata.goal,
      level: metadata.level,
      targetAudience: metadata.targetAudience,
      environment: metadata.environment,
      estimatedWeeks: metadata.estimatedWeeks,
      schemaVersion: metadata.schemaVersion,
      archivedAt: metadata.archivedAt,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      isGlobal: professionalId === null,
    };
  }

  private assertPersonal(user: AuthUser) {
    if (user.role !== 'PERSONAL')
      throw new ForbiddenException(
        'Acesso permitido somente a personal trainer.',
      );
  }
}
