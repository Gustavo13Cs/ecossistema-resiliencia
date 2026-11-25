import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PhysioScaleType } from '@prisma/client';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { CreatePhysioFunctionalScaleDto } from './dto/physio-functional-scale.dto';
import { PhysioFunctionalScalesService } from './physio-functional-scales.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('rehab-plans/scales')
export class PhysioFunctionalScalesController {
  constructor(private readonly scalesService: PhysioFunctionalScalesService) {}

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  listByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query('scaleType') scaleType?: string,
  ) {
    let parsedType: PhysioScaleType | undefined;
    if (scaleType !== undefined && scaleType !== '') {
      if (
        !Object.values(PhysioScaleType).includes(scaleType as PhysioScaleType)
      ) {
        throw new BadRequestException('Tipo de escala funcional inválido');
      }
      parsedType = scaleType as PhysioScaleType;
    }
    return this.scalesService.listByClient(request.user, clientId, parsedType);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreatePhysioFunctionalScaleDto,
  ) {
    return this.scalesService.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scalesService.remove(request.user, id);
  }
}
