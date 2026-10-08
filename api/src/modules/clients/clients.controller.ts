import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { ClientOverviewService } from './client-overview.service';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('NUTRITIONIST', 'PERSONAL', 'PHYSIO')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly clientOverviewService: ClientOverviewService,
  ) {}

  @ClinicalResponse({ shape: 'client' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'client' })
  @Get()
  findAll(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.findAll(request.user, query.status ?? 'ACTIVE');
  }

  @ClinicalResponse({ shape: 'overview' })
  @Get(':clientId/overview')
  getOverview(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.clientOverviewService.getOverview(request.user, clientId);
  }

  @ClinicalResponse({ shape: 'client' })
  @Get(':id')
  findOne(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientsService.findOne(request.user, id);
  }

  @ClinicalResponse({ shape: 'client' })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'client' })
  @Patch(':id/status')
  setStatus(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateClientStatusDto,
  ) {
    return this.clientsService.setStatus(request.user, id, dto.status);
  }
}
