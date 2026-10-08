import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnamnesesService } from './anamneses.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('anamneses')
export class AnamnesesController {
  constructor(private readonly anamnesesService: AnamnesesService) {}

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createDto: CreateAnamnesisDto,
  ) {
    return this.anamnesesService.create(request.user, createDto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  findByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.anamnesesService.findByClient(request.user, clientId);
  }
}
