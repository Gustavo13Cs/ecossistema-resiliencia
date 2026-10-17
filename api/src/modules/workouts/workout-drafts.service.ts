import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkoutDraft } from '@prisma/client';
import { isUUID } from 'class-validator';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockOwnedClient } from '../../common/client-access/lock-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreateWorkoutDraftDto,
  DraftVersionDto,
  RebaseWorkoutDraftDto,
  SaveWorkoutDraftDto,
} from './dto/workout-draft.dto';
import {
  assertDraftContentSize,
  normalizeDraftContent,
  toFinalizedWorkoutInput,
} from './workout-draft-content';
import {
  DraftAck,
  DraftContentV1,
  DraftCursor,
  DraftListQuery,
  DraftPage,
  DraftSummary,
  FinalizedDraftResult,
  WorkoutDraftResource,
  WORKOUT_DRAFT_SCHEMA_VERSION,
} from './workout-draft.types';
import { workoutDetailSelect } from './training-read.service';
import { WorkoutsService } from './workouts.service';

@Injectable()
export class WorkoutDraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
    private readonly workouts: WorkoutsService,
  ) {}

  async list(user: AuthUser, query: DraftListQuery = {}): Promise<DraftPage> {
    this.assertPersonal(user);
    const limit = query.limit ?? 20;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 20 ||
      (query.clientId !== undefined && !isUUID(query.clientId))
    )
      throw new BadRequestException('Consulta de rascunhos inválida');
    if (query.clientId)
      await this.clientAccess.getOwnedClient(user, query.clientId);
    const cursor =
      query.cursor === undefined ? null : this.decodeCursor(query.cursor);
    if (cursor) {
      const anchor = await this.prisma.workoutDraft.findFirst({
        where: {
          id: cursor.id,
          updatedAt: new Date(cursor.updatedAt),
          professionalId: user.sub,
          status: 'OPEN',
          clientId: query.clientId,
          client: { professionalId: user.sub },
        },
        select: { id: true },
      });
      if (!anchor)
        throw new BadRequestException('Cursor de rascunhos inválido');
    }
    const clientFilter = query.clientId
      ? Prisma.sql`AND d."clientId" = ${query.clientId}`
      : Prisma.empty;
    const cursorFilter = cursor
      ? Prisma.sql`AND (d."updatedAt" < ${new Date(cursor.updatedAt)} OR (d."updatedAt" = ${new Date(cursor.updatedAt)} AND d.id > ${cursor.id}))`
      : Prisma.empty;
    // Somente o título é extraído do JSON; o conteúdo clínico não integra a página.
    const rows = await this.prisma.$queryRaw<DraftSummary[]>`
      SELECT d.id, d."clientId", d.status, d.version, d."createdAt", d."updatedAt", coalesce(d.content->>'title','') AS title,
        jsonb_build_object('id',c.id,'name',c.name,'status',c.status) AS client
      FROM workout_drafts d JOIN clients c ON c.id = d."clientId"
      WHERE d."professionalId" = ${user.sub} AND c."professionalId" = ${user.sub} AND d.status = 'OPEN'
      ${clientFilter} ${cursorFilter}
      ORDER BY d."updatedAt" DESC, d.id ASC LIMIT ${limit + 1}
    `;
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(
              JSON.stringify({
                updatedAt: last.updatedAt.toISOString(),
                id: last.id,
              } satisfies DraftCursor),
            ).toString('base64url')
          : null,
    };
  }

  async create(
    user: AuthUser,
    dto: CreateWorkoutDraftDto,
  ): Promise<WorkoutDraftResource> {
    this.assertPersonal(user);
    await this.clientAccess.getOwnedClient(user, dto.clientId);
    if ((dto.sourceWorkoutId !== undefined) === (dto.content !== undefined))
      throw new BadRequestException(
        'Envie content ou sourceWorkoutId, exclusivamente.',
      );
    return this.prisma.$transaction(async (tx) => {
      await this.lockActiveClient(tx, user, dto.clientId);
      const existing = await tx.workoutDraft.findFirst({
        where: {
          professionalId: user.sub,
          clientId: dto.clientId,
          status: 'OPEN',
        },
        select: { id: true },
      });
      if (existing)
        throw new ConflictException({
          code: 'DRAFT_EXISTS',
          message: 'Já existe um rascunho aberto para este aluno',
          id: existing.id,
          clientId: dto.clientId,
        });
      let content: DraftContentV1;
      if (dto.sourceWorkoutId) {
        const source = await tx.workout.findFirst({
          where: {
            id: dto.sourceWorkoutId,
            creatorId: user.sub,
            clientId: dto.clientId,
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
        if (!source)
          throw new NotFoundException('Treino de origem não encontrado');
        content = normalizeDraftContent({
          title: source.title,
          goal: source.goal ?? '',
          durationWeeks: source.durationWeeks,
          notes: source.notes ?? '',
          splits: source.splits.map((split) => ({
            name: split.name,
            focus: split.focus ?? '',
            exercises: split.exercises.map((exercise) => ({
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              rest: exercise.rest ?? '',
              notes: exercise.notes ?? '',
              muscleGroup: exercise.muscleGroup,
              load: exercise.load ?? '',
              effortType: exercise.effortType,
              effortTarget: exercise.effortTarget ?? '',
              tempo: exercise.tempo ?? '',
              method: exercise.method,
            })),
          })),
        });
      } else {
        content = normalizeDraftContent(dto.content!);
      }
      assertDraftContentSize(content);
      const baseActiveWorkoutId = await this.activeId(tx, user, dto.clientId);
      return this.resource(
        await tx.workoutDraft.create({
          data: {
            professionalId: user.sub,
            clientId: dto.clientId,
            sourceWorkoutId: dto.sourceWorkoutId ?? null,
            baseActiveWorkoutId,
            schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
            content,
          },
        }),
      );
    });
  }

  async get(user: AuthUser, id: string): Promise<WorkoutDraftResource> {
    this.assertPersonal(user);
    const draft = await this.ownedDraft(this.prisma, user, id);
    return this.resource(draft);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: SaveWorkoutDraftDto,
  ): Promise<WorkoutDraftResource> {
    return this.mutate(user, id, async (tx, draft) => {
      this.assertOpenVersion(draft, dto.expectedVersion);
      const content = normalizeDraftContent(dto.content);
      assertDraftContentSize(content);
      return this.resource(
        await tx.workoutDraft.update({
          where: { id: draft.id },
          data: { content, version: { increment: 1 } },
        }),
      );
    });
  }

  async rebase(
    user: AuthUser,
    id: string,
    dto: RebaseWorkoutDraftDto,
  ): Promise<WorkoutDraftResource> {
    return this.mutate(user, id, async (tx, draft) => {
      this.assertOpenVersion(draft, dto.expectedVersion);
      const active = await this.activeId(tx, user, draft.clientId);
      if (active !== dto.expectedActiveWorkoutId)
        this.conflict(
          'ACTIVE_WORKOUT_CHANGED',
          'O treino ativo mudou. Confira a ficha atual antes de confirmar.',
        );
      return this.resource(
        await tx.workoutDraft.update({
          where: { id: draft.id },
          data: { baseActiveWorkoutId: active, version: { increment: 1 } },
        }),
      );
    });
  }

  async finalize(
    user: AuthUser,
    id: string,
    dto: DraftVersionDto,
  ): Promise<FinalizedDraftResult> {
    return this.mutate(user, id, async (tx, draft) => {
      if (draft.status !== 'OPEN') {
        this.assertRetry(draft, dto.expectedVersion, 'FINALIZED');
        const workout = await tx.workout.findFirst({
          where: {
            id: draft.finalizedWorkoutId!,
            creatorId: user.sub,
            clientId: draft.clientId,
            client: { professionalId: user.sub },
          },
          select: workoutDetailSelect,
        });
        if (!workout?.client || workout.clientId !== draft.clientId)
          throw new NotFoundException('Treino finalizado não encontrado');
        return {
          ...this.ack(draft),
          finalizedWorkoutId: workout.id,
          workout: {
            ...workout,
            clientId: draft.clientId,
            client: workout.client,
          },
        };
      }
      this.assertOpenVersion(draft, dto.expectedVersion);
      if (
        (await this.activeId(tx, user, draft.clientId)) !==
        draft.baseActiveWorkoutId
      )
        this.conflict(
          'ACTIVE_WORKOUT_CHANGED',
          'O treino ativo mudou. Confirme a nova base antes de finalizar.',
        );
      const input = toFinalizedWorkoutInput(
        draft.clientId,
        this.content(draft),
      );
      const workout = await this.workouts.createFromDraft(
        user,
        input,
        draft.sourceWorkoutId,
      );
      const closed = await tx.workoutDraft.update({
        where: { id: draft.id },
        data: {
          status: 'FINALIZED',
          content: Prisma.DbNull,
          closedAt: new Date(),
          finalizedWorkoutId: workout.id,
          version: { increment: 1 },
        },
      });
      return { ...this.ack(closed), finalizedWorkoutId: workout.id, workout };
    });
  }

  async discard(
    user: AuthUser,
    id: string,
    dto: DraftVersionDto,
  ): Promise<DraftAck> {
    return this.mutate(user, id, async (tx, draft) => {
      if (draft.status !== 'OPEN') {
        this.assertRetry(draft, dto.expectedVersion, 'DISCARDED');
        return this.ack(draft);
      }
      this.assertOpenVersion(draft, dto.expectedVersion);
      return this.ack(
        await tx.workoutDraft.update({
          where: { id: draft.id },
          data: {
            status: 'DISCARDED',
            content: Prisma.DbNull,
            closedAt: new Date(),
            version: { increment: 1 },
          },
        }),
      );
    });
  }

  private async mutate<T>(
    user: AuthUser,
    id: string,
    operation: (
      tx: Prisma.TransactionClient,
      draft: WorkoutDraft,
    ) => Promise<T>,
  ): Promise<T> {
    this.assertPersonal(user);
    const initial = await this.ownedDraft(this.prisma, user, id);
    await this.clientAccess.getOwnedClient(user, initial.clientId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockActiveClient(tx, user, initial.clientId);
      await tx.$queryRaw`SELECT id FROM workout_drafts WHERE id = ${id} AND "professionalId" = ${user.sub} AND "clientId" = ${initial.clientId} FOR UPDATE`;
      const draft = await this.ownedDraft(tx, user, id);
      if (draft.clientId !== initial.clientId)
        throw new NotFoundException('Rascunho não encontrado');
      return operation(tx, draft);
    });
  }
  private async ownedDraft(
    db: Pick<Prisma.TransactionClient, 'workoutDraft'>,
    user: AuthUser,
    id: string,
  ) {
    const draft = await db.workoutDraft.findFirst({
      where: {
        id,
        professionalId: user.sub,
        client: { professionalId: user.sub },
      },
    });
    if (!draft) throw new NotFoundException('Rascunho não encontrado');
    return draft;
  }
  private async lockActiveClient(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    clientId: string,
  ) {
    await lockOwnedClient(tx, clientId, user.sub);
    const client = await tx.client.findFirst({
      where: { id: clientId, professionalId: user.sub },
      select: { status: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    if (client.status === 'ARCHIVED')
      this.conflict(
        'CLIENT_ARCHIVED',
        'Aluno arquivado não permite alterações no rascunho',
      );
  }
  private async activeId(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    clientId: string,
  ): Promise<string | null> {
    const active = await tx.workout.findFirst({
      where: {
        clientId,
        creatorId: user.sub,
        isActive: true,
        client: { professionalId: user.sub },
      },
      select: { id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return active?.id ?? null;
  }
  private assertPersonal(user: AuthUser) {
    if (user.role !== 'PERSONAL')
      throw new ForbiddenException(
        'Acesso permitido somente a personal trainer',
      );
  }
  private assertOpenVersion(draft: WorkoutDraft, expected: number) {
    if (draft.status !== 'OPEN')
      this.conflict('DRAFT_CLOSED', 'O rascunho já foi encerrado');
    if (draft.version !== expected)
      this.conflict(
        'DRAFT_VERSION_CONFLICT',
        'O rascunho foi alterado. Recarregue antes de continuar.',
      );
  }
  private assertRetry(
    draft: WorkoutDraft,
    expected: number,
    status: 'FINALIZED' | 'DISCARDED',
  ) {
    if (draft.status !== status)
      this.conflict('DRAFT_CLOSED', 'O rascunho já foi encerrado');
    if (draft.version !== expected + 1)
      this.conflict(
        'DRAFT_VERSION_CONFLICT',
        'A versão não corresponde à operação concluída',
      );
  }
  private conflict(code: string, message: string): never {
    throw new ConflictException({ code, message });
  }
  private ack(draft: WorkoutDraft): DraftAck {
    return {
      id: draft.id,
      clientId: draft.clientId,
      status: draft.status,
      version: draft.version,
    };
  }
  private content(draft: WorkoutDraft): DraftContentV1 {
    if (draft.schemaVersion !== WORKOUT_DRAFT_SCHEMA_VERSION)
      throw new BadRequestException('Formato de rascunho não suportado');
    return draft.content as unknown as DraftContentV1;
  }
  private resource(draft: WorkoutDraft): WorkoutDraftResource {
    return {
      ...this.ack(draft),
      schemaVersion: draft.schemaVersion,
      content: draft.status === 'OPEN' ? this.content(draft) : null,
      sourceWorkoutId: draft.sourceWorkoutId,
      baseActiveWorkoutId: draft.baseActiveWorkoutId,
      finalizedWorkoutId: draft.finalizedWorkoutId,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      closedAt: draft.closedAt,
    };
  }
  private decodeCursor(encoded: string): DraftCursor {
    try {
      if (
        typeof encoded !== 'string' ||
        encoded.length > 512 ||
        !/^[A-Za-z0-9_-]+$/.test(encoded)
      )
        throw new Error();
      const raw = Buffer.from(encoded, 'base64url').toString('utf8');
      const value = JSON.parse(raw) as DraftCursor;
      if (
        !value ||
        typeof value !== 'object' ||
        Object.keys(value).length !== 2 ||
        typeof value.id !== 'string' ||
        !isUUID(value.id) ||
        typeof value.updatedAt !== 'string' ||
        new Date(value.updatedAt).toISOString() !== value.updatedAt ||
        JSON.stringify({ updatedAt: value.updatedAt, id: value.id }) !== raw ||
        Buffer.from(raw).toString('base64url') !== encoded
      )
        throw new Error();
      return value;
    } catch {
      throw new BadRequestException('Cursor de rascunhos inválido');
    }
  }
}
