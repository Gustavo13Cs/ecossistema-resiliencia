import type { Response } from 'express';
import { setPaginationHeaders } from '../../common/pagination/pagination';
import { PageQueryDto } from '../../common/pagination/page-query.dto';
import {
  ListLabExamsQueryDto,
  LabLongitudinalQueryDto,
} from './dto/list-lab-exams-query.dto';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Controller,
  Post,
  Body,
  Get,
  Header,
  Param,
  UseGuards,
  Request,
  Query,
  Res,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LabExamsService } from './lab-exams.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('lab-exams')
export class LabExamsController {
  constructor(private readonly labExamsService: LabExamsService) {}

  @ClinicalResponse({ shape: 'resource-page' })
  @Get()
  @Header('Cache-Control', 'no-store')
  findAll(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListLabExamsQueryDto,
  ) {
    return this.labExamsService.findPage(request.user, query);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('longitudinal')
  @Header('Cache-Control', 'no-store')
  async longitudinal(
    @Request() request: AuthenticatedRequest,
    @Query() query: LabLongitudinalQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.labExamsService.longitudinal(request.user, query);
    setPaginationHeaders(response, result.pagination);
    return result.items;
  }

  @ClinicalResponse({
    shape: 'ack',
  })
  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.labExamsService.remove(request.user, id);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  @Header('Cache-Control', 'no-store')
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createLabExamDto: CreateLabExamDto,
  ) {
    return this.labExamsService.create(request.user, createLabExamDto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  @Header('Cache-Control', 'no-store')
  async findByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.labExamsService.findClientPage(
      request.user,
      clientId,
      query,
    );
    setPaginationHeaders(response, result.pagination);
    return result.items;
  }
}
