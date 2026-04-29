import { Controller, Post, Body, Get, Param, UseGuards, Request,Delete} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard) 
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  create(@Request() req, @Body() createWorkoutDto: CreateWorkoutDto) {
    return this.workoutsService.create(req.user.sub, createWorkoutDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.workoutsService.findAllByProfessional(req.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(@Param('userId') userId: string) {
    return this.workoutsService.findActiveByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workoutsService.remove(id);
  }
}