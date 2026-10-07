import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
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
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { AppointmentActionDto } from './dto/appointment-action.dto';
import { AppointmentRangeQueryDto } from './dto/appointment-range-query.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsService } from './appointments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('NUTRITIONIST', 'PERSONAL', 'PHYSIO')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(request.user, dto);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: AppointmentRangeQueryDto,
  ) {
    return this.appointmentsService.list(request.user, query);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Get(':id')
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.appointmentsService.findOne(request.user, id);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(request.user, id, dto);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Post(':id/confirm')
  confirm(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AppointmentActionDto,
  ) {
    return this.appointmentsService.confirm(request.user, id, dto);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Post(':id/complete')
  complete(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AppointmentActionDto,
  ) {
    return this.appointmentsService.complete(request.user, id, dto);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Post(':id/no-show')
  markNoShow(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AppointmentActionDto,
  ) {
    return this.appointmentsService.markNoShow(request.user, id, dto);
  }

  @ClinicalResponse({
    domain: 'APPOINTMENT',
    shape: 'resource',
    isolation: 'Serializable',
  })
  @Post(':id/cancel')
  cancel(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(request.user, id, dto);
  }
}
