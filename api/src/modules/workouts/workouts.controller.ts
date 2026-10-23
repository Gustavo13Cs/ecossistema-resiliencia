import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { TrainingReadService } from './training-read.service';
import { ExerciseLibraryService } from './exercise-library.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto';
import { UpdateExerciseVideoDto } from './dto/update-exercise-video.dto';
import { ExerciseLibraryQueryDto } from './dto/exercise-library-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.training)
@Controller('workouts')
export class WorkoutsController {
  constructor(
    private readonly workoutsService: WorkoutsService,
    private readonly trainingReadService: TrainingReadService,
    private readonly exerciseLibraryService: ExerciseLibraryService,
  ) {}

  @ClinicalResponse({ shape: 'resource-page' })
  @Get('workspace')
  getWorkspace(@Request() request: AuthenticatedRequest) {
    return this.trainingReadService.getWorkspace(request.user);
  }

  @ClinicalResponse({ shape: 'overview' })
  @Get('client/:clientId/overview')
  getClientOverview(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.trainingReadService.getClientOverview(request.user, clientId);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Get('exercise-library')
  listExerciseLibrary(
    @Request() request: AuthenticatedRequest,
    @Query() query: ExerciseLibraryQueryDto,
  ) {
    return this.exerciseLibraryService.list(request.user, query);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Post('exercise-library')
  createCustomExercise(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateCustomExerciseDto,
  ) {
    return this.exerciseLibraryService.create(request.user, dto);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Get('exercise-library/:exerciseId')
  getExerciseLibraryDetail(
    @Request() request: AuthenticatedRequest,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.exerciseLibraryService.get(request.user, exerciseId);
  }

  @ClinicalResponse({ exception: 'catalog' })
  @Patch('exercise-library/:id')
  updateExerciseVideo(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseVideoDto,
  ) {
    return this.exerciseLibraryService.updateVideo(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'ack' })
  @Delete('exercise-library/:id')
  removeCustomExercise(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exerciseLibraryService.remove(request.user, id);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createWorkoutDto: CreateWorkoutDto,
  ) {
    return this.workoutsService.create(request.user, createWorkoutDto);
  }

  // Lista treinos criados pelo profissional logado
  @ClinicalResponse({ shape: 'resource' })
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.workoutsService.findAllByProfessional(request.user);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId/active')
  findActive(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.workoutsService.findActive(request.user, clientId);
  }

  // Só o criador do treino pode deletar
  @ClinicalResponse({ shape: 'resource' })
  @Delete(':id')
  remove(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workoutsService.remove(request.user, id);
  }

  // Salvar um treino existente como template reutilizável
  @ClinicalResponse({
    shape: 'ack',
  })
  @Patch(':id/save-as-template')
  saveAsTemplate(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.workoutsService.saveAsTemplate(request.user, id);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get(':workoutId')
  getWorkout(
    @Request() request: AuthenticatedRequest,
    @Param('workoutId', ParseUUIDPipe) workoutId: string,
    @Query('week', new ParseIntPipe({ optional: true })) week?: number,
  ) {
    return week === undefined
      ? this.trainingReadService.getWorkout(request.user, workoutId)
      : this.trainingReadService.getWorkout(request.user, workoutId, week);
  }
}
