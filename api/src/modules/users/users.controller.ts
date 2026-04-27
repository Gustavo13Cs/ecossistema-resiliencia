import { Controller, Post, Body, Get, UseGuards, Request, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Request() req, @Body() createUserDto: any) {
    // O req.user.sub é o ID do profissional logado
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

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.usersService.unlinkPatient(req.user.sub, id);
  }

  // ⚠️ Rota comentada para não quebrar a compilação
  /*
  @Get(':id/workouts')
  getUserWorkouts(@Param('id') id: string) {
    return this.usersService.getUserWorkouts(id);
  }
  */
}