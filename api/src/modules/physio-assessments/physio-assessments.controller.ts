import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PhysioAssessmentsService } from './physio-assessments.service';
import { CreatePhysioAssessmentDto } from './dto/create-physio-assessment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.rehabilitation)
@Controller('physio-assessments')
export class PhysioAssessmentsController {
  constructor(private readonly service: PhysioAssessmentsService) {}

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreatePhysioAssessmentDto,
  ) {
    return this.service.create(request.user, dto);
  }

  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.service.findAllByProfessional(request.user);
  }

  @Get('client/:clientId')
  findByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.service.findByClient(request.user, clientId);
  }

  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.remove(request.user, id);
  }
}
