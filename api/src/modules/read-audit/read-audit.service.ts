import { randomUUID } from 'node:crypto';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ReadAuditAction } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { ClinicalResponsePolicy } from '../../common/decorators/clinical-response.decorator';

type AuditPolicy = Exclude<ClinicalResponsePolicy, { exception: string }>;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid classified clinical response');
  return value as Record<string, unknown>;
}
@Injectable()
export class ReadAuditService {
  constructor(private readonly prisma: PrismaService) {}
  async before(
    policy: AuditPolicy,
    parameters: Record<string, string>,
  ): Promise<string[]> {
    if (!policy.lookup) return [];
    const id = parameters[policy.parameter ?? 'id'];
    if (!id) throw new Error('Missing classified resource parameter');
    const select = { clientId: true } as const;
    let row: { clientId: string | null } | null;
    switch (policy.lookup) {
      case 'dietPlan':
        row = await this.prisma.dietPlan.findUnique({ where: { id }, select });
        break;
      case 'workout':
        row = await this.prisma.workout.findUnique({ where: { id }, select });
        break;
      case 'rehabPlan':
        row = await this.prisma.rehabPlan.findUnique({ where: { id }, select });
        break;
      case 'labExam':
        row = await this.prisma.labExam.findUnique({ where: { id }, select });
        break;
      case 'labOrder':
        row = await this.prisma.labOrder.findUnique({ where: { id }, select });
        break;
      case 'clientGoal':
        row = await this.prisma.clientGoal.findUnique({
          where: { clientId: id },
          select,
        });
        break;
      case 'meal': {
        const meal = await this.prisma.meal.findUnique({
          where: { id },
          select: { dietPlan: { select } },
        });
        row = meal?.dietPlan ?? null;
        break;
      }
    }
    return row?.clientId ? [row.clientId] : [];
  }
  extract(policy: AuditPolicy, result: unknown): string[] {
    if (result === null || result === undefined || policy.shape === 'ack')
      return [];
    const rows = Array.isArray(result)
      ? result
      : policy.shape === 'resource-page'
        ? object(result).items
        : [result];
    if (!Array.isArray(rows))
      throw new Error('Invalid classified clinical list');
    if (rows.length > 1000)
      throw new UnprocessableEntityException(
        'Consulta muito ampla. Restrinja o intervalo ou o prontuário.',
      );
    return rows.flatMap((value: unknown) => {
      const row = object(value);
      const id =
        policy.shape === 'client'
          ? row.id
          : policy.shape === 'overview'
            ? object(row.client).id
            : row.clientId;
      if (typeof id === 'string' && id.length > 0) return [id];
      if (
        policy.shape === 'resource' &&
        row.clientId === null &&
        row.isTemplate === true
      )
        return [];
      throw new Error('Missing Client identity in classified response');
    });
  }
  async record(policy: AuditPolicy, result: unknown, before: string[]) {
    const ids = [...new Set([...before, ...this.extract(policy, result)])];
    if (!ids.length) return;
    if (ids.length > 1000)
      throw new UnprocessableEntityException(
        'Consulta muito ampla. Restrinja o intervalo ou o prontuário.',
      );
    const principal = this.prisma.principal;
    const clients = await this.prisma.client.findMany({
      where: { id: { in: ids }, professionalId: principal.sub },
      select: { id: true },
    });
    if (clients.length !== ids.length)
      throw new Error('Unauthorized Client in prepared response');
    const action: ReadAuditAction =
      Array.isArray(result) || policy.shape === 'resource-page'
        ? 'LIST'
        : 'READ';
    for (let offset = 0; offset < ids.length; offset += 100) {
      const data = ids.slice(offset, offset + 100).map((clientId) => ({
        id: randomUUID(),
        tenantProfessionalId: principal.sub,
        clientId,
        actorType: 'PROFESSIONAL' as const,
        actorProfessionalId: principal.sub,
        sessionId: principal.sessionId!,
        systemTaskId: null,
        action,
        domain: policy.domain,
        requestId: this.prisma.requestId,
      }));
      await this.prisma.clientReadAuditEvent.createMany({ data });
      await this.prisma.auditDeliveryState.createMany({
        data: data.map((event) => ({ eventId: event.id })),
      });
    }
  }
}
