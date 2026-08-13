import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { AgendaService } from './agenda.service';
import { AgendaRangeQueryDto } from './dto/agenda-range-query.dto';
import { CompleteOccurrenceDto } from './dto/complete-occurrence.dto';
import { CreateAgendaTaskDto } from './dto/create-agenda-task.dto';
import { SkipOccurrenceDto } from './dto/skip-occurrence.dto';
import { UpdateAgendaTaskDto } from './dto/update-agenda-task.dto';

type AuthenticatedRequest = { user: AuthUser };

const CLINICAL_ROLES = ['NUTRITIONIST', 'PERSONAL', 'PHYSIO'];

@Controller('agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post('tasks')
  @Roles(...CLINICAL_ROLES)
  createTask(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateAgendaTaskDto,
  ) {
    return this.agendaService.createTask(request.user, dto);
  }

  @Patch('tasks/:id')
  @Roles(...CLINICAL_ROLES)
  updateTask(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateAgendaTaskDto,
  ) {
    return this.agendaService.updateTask(request.user, taskId, dto);
  }

  @Post('tasks/:id/pause')
  @Roles(...CLINICAL_ROLES)
  pauseTask(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) taskId: string,
  ) {
    return this.agendaService.pauseTask(request.user, taskId);
  }

  @Post('tasks/:id/end')
  @Roles(...CLINICAL_ROLES)
  endTask(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) taskId: string,
  ) {
    return this.agendaService.endTask(request.user, taskId);
  }

  @Get('patient/:patientId')
  @Roles('PATIENT', ...CLINICAL_ROLES)
  listPatientRange(
    @Request() request: AuthenticatedRequest,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: AgendaRangeQueryDto,
  ) {
    return this.agendaService.listPatientRange(
      request.user,
      patientId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Post('occurrences/:id/complete')
  @Roles('PATIENT')
  completeOccurrence(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) occurrenceId: string,
    @Body() dto: CompleteOccurrenceDto,
  ) {
    return this.agendaService.completeOccurrence(
      request.user,
      occurrenceId,
      dto.patientNote,
    );
  }

  @Post('occurrences/:id/skip')
  @Roles('PATIENT')
  skipOccurrence(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) occurrenceId: string,
    @Body() dto: SkipOccurrenceDto,
  ) {
    return this.agendaService.skipOccurrence(
      request.user,
      occurrenceId,
      dto.reason,
    );
  }
}
