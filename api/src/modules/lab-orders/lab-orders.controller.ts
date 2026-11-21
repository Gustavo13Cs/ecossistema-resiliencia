import type { Response } from 'express';
import { PageQueryDto } from '../../common/pagination/page-query.dto';
import { setPaginationHeaders } from '../../common/pagination/pagination';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { LabOrdersService } from './lab-orders.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
@Controller('lab-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
export class LabOrdersController {
  constructor(private readonly service: LabOrdersService) {}
  @ClinicalResponse({ shape: 'resource' })
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Request() request: AuthenticatedRequest,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.findPage(request.user, query);
    setPaginationHeaders(response, result.pagination);
    return result.items;
  }
  @ClinicalResponse({ shape: 'resource' })
  @Post()
  @Header('Cache-Control', 'no-store')
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateLabOrderDto,
  ) {
    return this.service.create(request.user, dto);
  }
  @ClinicalResponse({
    shape: 'ack',
  })
  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(request.user, id);
  }
}
