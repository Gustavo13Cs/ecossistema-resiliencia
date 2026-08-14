import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { WorkoutLogsService } from './workout-logs.service';
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workout-logs')
export class WorkoutLogsController {
  constructor(private readonly workoutLogsService: WorkoutLogsService) {}

  // Paciente registra uma sessão de treino
  @Roles('PATIENT')
  @Post()
  create(@Request() req, @Body() dto: CreateWorkoutLogDto) {
    return this.workoutLogsService.create(req.user.sub, dto);
  }

  // Paciente ou Personal vê o histórico de logs de um paciente
  @Get('patient/:patientId')
  findByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.workoutLogsService.findByPatient(patientId, req.user.sub, req.user.role);
  }

  // Personal consulta a evolução de carga de um exercício
  @Roles('PERSONAL', 'ADMIN')
  @Get('exercise/:exerciseId/progress/:patientId')
  getExerciseProgress(
    @Param('exerciseId') exerciseId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.workoutLogsService.getExerciseProgress(exerciseId, patientId);
  }
}
