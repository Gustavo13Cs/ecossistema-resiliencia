import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LabExamsService } from './lab-exams.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthUser } from '../../common/types/auth-user';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('lab-exams')
export class LabExamsController {
  constructor(private readonly labExamsService: LabExamsService) {}

  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.labExamsService.findAll(request.user);
  }

  @Delete(':id')
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.labExamsService.remove(request.user, id);
  }

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createLabExamDto: CreateLabExamDto,
  ) {
    return this.labExamsService.create(request.user, createLabExamDto);
  }

  @Get('client/:clientId')
  findByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.labExamsService.findByClient(request.user, clientId);
  }
}
