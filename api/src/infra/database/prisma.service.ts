import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user';
import { assertDatabaseRole, databaseClient } from './database-clients';

function transactionBound(
  name: string,
  fallback: number,
  maximum: number,
): number {
  const raw = process.env[name] ?? String(fallback);
  const value = Number(raw);
  if (
    !/^[0-9]+$/.test(raw) ||
    !Number.isSafeInteger(value) ||
    value < 100 ||
    value > maximum
  )
    throw new Error('Invalid ' + name);
  return value;
}
type Context = {
  tx: Prisma.TransactionClient;
  principal: AuthUser;
  requestId: string;
  active: boolean;
  isolation: Prisma.TransactionIsolationLevel;
};
type TransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly root: PrismaClient;
  private readonly maxWait = transactionBound(
    'CLINICAL_TRANSACTION_MAX_WAIT_MS',
    10000,
    60000,
  );
  private readonly timeout = transactionBound(
    'CLINICAL_TRANSACTION_TIMEOUT_MS',
    30000,
    120000,
  );
  private readonly context = new AsyncLocalStorage<Context>();
  constructor() {
    this.root = databaseClient('CLINICAL_DATABASE_URL');
  }
  async $connect() {
    await this.root.$connect();
  }
  async $disconnect() {
    await this.root.$disconnect();
  }
  async onModuleInit() {
    await this.$connect();
    await assertDatabaseRole(this.root, 'safemove_clinical');
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  private current() {
    const context = this.context.getStore();
    if (!context?.active) throw new Error('Clinical database context required');
    return context;
  }
  get principal() {
    return this.current().principal;
  }
  get requestId() {
    return this.current().requestId;
  }
  get $queryRaw() {
    return this.current().tx.$queryRaw.bind(this.current().tx);
  }
  get $executeRaw() {
    return this.current().tx.$executeRaw.bind(this.current().tx);
  }
  async $transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const context = this.current();
    // O helper conserva a isolação declarada pela fronteira e reutiliza sua conexão.
    if (options?.isolationLevel && options.isolationLevel !== context.isolation)
      throw new Error('Nested isolation level must match clinical transaction');
    return operation(context.tx);
  }
  async runAsProfessional<T>(
    principal: AuthUser,
    requestId: string,
    operation: () => Promise<T>,
    isolation: Prisma.TransactionIsolationLevel = Prisma
      .TransactionIsolationLevel.ReadCommitted,
  ): Promise<T> {
    if (
      !principal.sub ||
      !principal.sessionId ||
      !principal.role ||
      !requestId ||
      this.context.getStore()
    )
      throw new Error(
        'Validated principal and fresh clinical context required',
      );
    const identity = Object.freeze({ ...principal });
    return this.root.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT set_config('safemove.professional_id', ${identity.sub}, true),
        set_config('safemove.role', ${identity.role}, true),
        set_config('safemove.session_id', ${identity.sessionId}, true),
        set_config('safemove.request_id', ${requestId}, true)`;
        const context: Context = {
          tx,
          principal: identity,
          requestId,
          active: true,
          isolation,
        };
        try {
          return await this.context.run(context, operation);
        } finally {
          context.active = false;
        }
      },
      {
        isolationLevel: isolation,
        maxWait: this.maxWait,
        timeout: this.timeout,
      },
    );
  }
  get clientReadAuditEvent() {
    return this.current().tx.clientReadAuditEvent;
  }
  get auditDeliveryState() {
    return this.current().tx.auditDeliveryState;
  }
  get user() {
    return this.current().tx.user;
  }
  get authSession() {
    return this.current().tx.authSession;
  }
  get professionalPatientLink() {
    return this.current().tx.professionalPatientLink;
  }
  get client() {
    return this.current().tx.client;
  }
  get clientAuditEvent() {
    return this.current().tx.clientAuditEvent;
  }
  get appointment() {
    return this.current().tx.appointment;
  }
  get appointmentEvent() {
    return this.current().tx.appointmentEvent;
  }
  get recipe() {
    return this.current().tx.recipe;
  }
  get recipeVersion() {
    return this.current().tx.recipeVersion;
  }
  get recipeIngredient() {
    return this.current().tx.recipeIngredient;
  }
  get dietPlan() {
    return this.current().tx.dietPlan;
  }
  get food() {
    return this.current().tx.food;
  }
  get meal() {
    return this.current().tx.meal;
  }
  get mealItem() {
    return this.current().tx.mealItem;
  }
  get physicalAssessment() {
    return this.current().tx.physicalAssessment;
  }
  get foodPreference() {
    return this.current().tx.foodPreference;
  }
  get workout() {
    return this.current().tx.workout;
  }
  get workoutSplit() {
    return this.current().tx.workoutSplit;
  }
  get workoutExercise() {
    return this.current().tx.workoutExercise;
  }
  get physioAssessment() {
    return this.current().tx.physioAssessment;
  }
  get rehabPlan() {
    return this.current().tx.rehabPlan;
  }
  get rehabSession() {
    return this.current().tx.rehabSession;
  }
  get rehabExercise() {
    return this.current().tx.rehabExercise;
  }
  get workoutLog() {
    return this.current().tx.workoutLog;
  }
  get workoutLogSet() {
    return this.current().tx.workoutLogSet;
  }
  get mealLog() {
    return this.current().tx.mealLog;
  }
  get dailyTracking() {
    return this.current().tx.dailyTracking;
  }
  get agendaTask() {
    return this.current().tx.agendaTask;
  }
  get agendaTaskOccurrence() {
    return this.current().tx.agendaTaskOccurrence;
  }
  get patientConsent() {
    return this.current().tx.patientConsent;
  }
  get healthCheckIn() {
    return this.current().tx.healthCheckIn;
  }
  get anamnesis() {
    return this.current().tx.anamnesis;
  }
  get consultationNote() {
    return this.current().tx.consultationNote;
  }
  get supplementPlan() {
    return this.current().tx.supplementPlan;
  }
  get supplementItem() {
    return this.current().tx.supplementItem;
  }
  get labExam() {
    return this.current().tx.labExam;
  }
  get labMarker() {
    return this.current().tx.labMarker;
  }
  get patientAlert() {
    return this.current().tx.patientAlert;
  }
  get clientGoal() {
    return this.current().tx.clientGoal;
  }
  get labOrder() {
    return this.current().tx.labOrder;
  }
}
