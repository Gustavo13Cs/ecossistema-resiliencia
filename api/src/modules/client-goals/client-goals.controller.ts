import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { ClientGoalsService } from './client-goals.service';
import { UpsertClientGoalDto } from './dto/upsert-client-goal.dto';

@Controller('client-goals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
export class ClientGoalsController {
  constructor(private readonly service: ClientGoalsService) {}
  @ClinicalResponse({ shape: 'resource' })
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Request() request: AuthenticatedRequest) {
    return this.service.list(request.user);
  }
  @ClinicalResponse({ shape: 'resource' })
  @Get(':clientId')
  @Header('Cache-Control', 'no-store')
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.service.findOne(request.user, clientId);
  }
  @ClinicalResponse({ shape: 'resource' })
  @Put(':clientId')
  @Header('Cache-Control', 'no-store')
  upsert(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: UpsertClientGoalDto,
  ) {
    return this.service.upsert(request.user, clientId, dto);
  }
  @ClinicalResponse({
    shape: 'ack',
  })
  @Delete(':clientId')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.service.remove(request.user, clientId);
  }
}
