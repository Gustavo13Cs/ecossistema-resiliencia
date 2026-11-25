import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import {
  CreatePhysioPackageDto,
  UpdatePhysioPackageDto,
} from './dto/physio-package.dto';
import { PhysioPackagesService } from './physio-packages.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans/packages')
export class PhysioPackagesController {
  constructor(private readonly service: PhysioPackagesService) {}

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  listByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.service.listByClient(request.user, clientId);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreatePhysioPackageDto,
  ) {
    return this.service.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhysioPackageDto,
  ) {
    return this.service.update(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(request.user, id);
  }
}
