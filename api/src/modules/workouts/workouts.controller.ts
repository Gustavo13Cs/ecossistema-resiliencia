import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard) 
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  create(@Request() req, @Body() createWorkoutDto: CreateWorkoutDto) {
    const userId = req.user.sub; 
    return this.workoutsService.create(userId, createWorkoutDto);
  }

  @Get()
  findAll(@Request() req) {
    const userId = req.user.sub;
    
    return this.workoutsService.findAll(userId);
  }
}