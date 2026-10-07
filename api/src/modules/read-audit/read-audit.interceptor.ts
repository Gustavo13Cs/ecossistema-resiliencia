import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  OnApplicationBootstrap,
  HttpException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { defer, lastValueFrom } from 'rxjs';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import {
  CLINICAL_RESPONSE,
  ClinicalResponsePolicy,
} from '../../common/decorators/clinical-response.decorator';
import { ReadAuditService } from './read-audit.service';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class ReadAuditInterceptor
  implements NestInterceptor, OnApplicationBootstrap
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly audit: ReadAuditService,
  ) {}
  onApplicationBootstrap() {
    for (const { instance } of this.discovery.getControllers()) {
      if (!instance) continue;
      const prototype = Object.getPrototypeOf(instance) as object;
      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const handler = (instance as Record<string, unknown>)[name];
        if (
          typeof handler !== 'function' ||
          Reflect.getMetadata(METHOD_METADATA, handler) === undefined
        )
          continue;
        if (
          !this.reflector.get<ClinicalResponsePolicy>(
            CLINICAL_RESPONSE,
            handler,
          )
        )
          throw new Error(
            'Unclassified HTTP handler: ' +
              (instance as { constructor: { name: string } }).constructor.name +
              '.' +
              name,
          );
      }
    }
  }
  intercept(context: ExecutionContext, next: CallHandler) {
    return defer(async () => {
      const policy = this.reflector.get<ClinicalResponsePolicy>(
        CLINICAL_RESPONSE,
        context.getHandler(),
      );
      if (!policy)
        throw new InternalServerErrorException('Operação indisponível');
      if (
        'exception' in policy &&
        (policy.exception === 'auth' || policy.exception === 'health')
      )
        return lastValueFrom<unknown>(next.handle());
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const response = context
        .switchToHttp()
        .getResponse<{ setHeader: (name: string, value: string) => void }>();
      const requestId = randomUUID();
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Request-Id', requestId);
      try {
        return await this.prisma.runAsProfessional(
          request.user,
          requestId,
          async () => {
            const before =
              'exception' in policy
                ? []
                : await this.audit.before(
                    policy,
                    request.params as Record<string, string>,
                  );
            const result: unknown = await lastValueFrom<unknown>(next.handle());
            if (!('exception' in policy))
              await this.audit.record(policy, result, before);
            return result;
          },
          'exception' in policy ? undefined : policy.isolation,
        );
      } catch (error) {
        if (error instanceof HttpException) throw error;
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2034'
        )
          throw new ConflictException(
            'Operação concorrente. Atualize os dados e tente novamente.',
          );
        // Não propagar query, payload, DSN ou metadados do erro de persistência.
        throw new InternalServerErrorException('Operação indisponível');
      }
    });
  }
}
