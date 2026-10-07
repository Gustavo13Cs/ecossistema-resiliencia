import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConsultationNotesService } from './consultation-notes.service';
import { CreateConsultationNoteDto } from './dto/create-consultation-note.dto';
import { UpdateConsultationNoteDto } from './dto/update-consultation-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('consultation-notes')
export class ConsultationNotesController {
  constructor(private readonly service: ConsultationNotesService) {}

  @ClinicalResponse({ domain: 'CONSULTATION_NOTE', shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateConsultationNoteDto,
  ) {
    return this.service.create(request.user, dto);
  }

  @ClinicalResponse({ domain: 'CONSULTATION_NOTE', shape: 'resource' })
  @Get('client/:clientId')
  findByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.service.findByClient(request.user, clientId);
  }

  @ClinicalResponse({ domain: 'CONSULTATION_NOTE', shape: 'resource' })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationNoteDto,
  ) {
    return this.service.update(request.user, id, dto);
  }

  @ClinicalResponse({ domain: 'CONSULTATION_NOTE', shape: 'resource' })
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.remove(request.user, id);
  }
}
