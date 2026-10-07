import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotFoundException } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';

class ReadAuditQuery {
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
@Controller('read-audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('NUTRITIONIST', 'PERSONAL', 'PHYSIO')
export class ReadAuditController {
  constructor(private readonly prisma: PrismaService) {}
  @ClinicalResponse({ domain: 'AUDIT', shape: 'resource-page' })
  @Get()
  async list(
    @Request() request: AuthenticatedRequest,
    @Query() query: ReadAuditQuery,
  ) {
    if (
      query.cursor &&
      !(await this.prisma.clientReadAuditEvent.findFirst({
        where: { id: query.cursor, tenantProfessionalId: request.user.sub },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Página indisponível');
    const rows = await this.prisma.clientReadAuditEvent.findMany({
      where: {
        tenantProfessionalId: request.user.sub,
        clientId: query.clientId,
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, query.limit);
    return {
      items,
      nextCursor: rows.length > query.limit ? items.at(-1)!.id : null,
    };
  }
}
