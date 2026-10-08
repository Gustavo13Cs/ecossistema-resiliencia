import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { ClinicalResponsePolicy } from '../decorators/clinical-response.decorator';

type ClassifiedPolicy = Exclude<ClinicalResponsePolicy, { exception: string }>;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid classified clinical response');
  return value as Record<string, unknown>;
}
@Injectable()
export class ClinicalResponseValidator {
  constructor(private readonly prisma: PrismaService) {}
  extract(policy: ClassifiedPolicy, result: unknown): string[] {
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
  async validate(policy: ClassifiedPolicy, result: unknown) {
    const ids = [...new Set(this.extract(policy, result))];
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
  }
}
