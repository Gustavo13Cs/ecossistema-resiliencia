import { Controller, Post, Body, Get, UseGuards, Request, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Request() req, @Body() createUserDto: any) {
    return this.usersService.create(createUserDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/workouts')
  getUserWorkouts(@Param('id') id: string) {
    return this.usersService.getUserWorkouts(id);
  }
}