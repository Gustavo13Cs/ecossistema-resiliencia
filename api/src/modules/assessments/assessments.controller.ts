import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.sharedAssessment)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @ClinicalResponse({ domain: 'ASSESSMENT', shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.create(
      createAssessmentDto,
      request.user.sub,
    );
  }

  @ClinicalResponse({ domain: 'ASSESSMENT', shape: 'resource' })
  @Get('user/:userId')
  findByUser(
    @Request() request: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.assessmentsService.findByUser(userId, request.user.sub);
  }

  @ClinicalResponse({ domain: 'ASSESSMENT', shape: 'resource' })
  @Get('client/:clientId')
  findByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.assessmentsService.findByClient(clientId, request.user.sub);
  }

  @ClinicalResponse({ domain: 'ASSESSMENT', shape: 'resource' })
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.assessmentsService.remove(id, request.user.sub);
  }

  @ClinicalResponse({ domain: 'ASSESSMENT', shape: 'resource' })
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.assessmentsService.findAll(request.user.sub);
  }
}
