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
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import {
  CreateStandaloneWorkoutTemplateDto,
  CreateWorkoutTemplateDto,
  DuplicateWorkoutTemplateDto,
  ImportWorkoutTemplateDto,
  UpdateWorkoutTemplateDto,
  WorkoutTemplateQueryDto,
} from './dto/workout-template.dto';
import { WorkoutTemplatesService } from './workout-templates.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PERSONAL')
@Controller('workouts/templates')
export class WorkoutTemplatesController {
  constructor(private readonly templates: WorkoutTemplatesService) {}

  @ClinicalResponse({ exception: 'private-template' })
  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: WorkoutTemplateQueryDto,
  ) {
    return this.templates.list(request.user, query);
  }

  @ClinicalResponse({ exception: 'private-template' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateStandaloneWorkoutTemplateDto,
  ) {
    return this.templates.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post('from-workout/:workoutId')
  fromWorkout(
    @Request() request: AuthenticatedRequest,
    @Param('workoutId', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkoutTemplateDto,
  ) {
    return this.templates.fromWorkout(request.user, id, dto);
  }

  @ClinicalResponse({ exception: 'private-template' })
  @Get(':id')
  get(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templates.get(request.user, id);
  }

  @ClinicalResponse({ exception: 'private-template' })
  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutTemplateDto,
  ) {
    return this.templates.update(request.user, id, dto);
  }

  @ClinicalResponse({ exception: 'private-template' })
  @Post(':id/duplicate')
  duplicate(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateWorkoutTemplateDto,
  ) {
    return this.templates.duplicate(request.user, id, dto);
  }

  @ClinicalResponse({ exception: 'private-template' })
  @Post(':id/archive')
  archive(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templates.archive(request.user, id);
  }

  @ClinicalResponse({ exception: 'private-template' })
  @Post(':id/restore')
  restore(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templates.restore(request.user, id);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post(':id/create-draft')
  createDraft(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportWorkoutTemplateDto,
  ) {
    return this.templates.createDraft(request.user, id, dto);
  }
}
