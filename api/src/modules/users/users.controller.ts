import { Controller, Post, Body, Get, UseGuards, Request, Param, Delete, Query, NotFoundException,Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }
  
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

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.usersService.unlinkPatient(req.user.sub, id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }
  // ⚠️ Rota comentada para não quebrar a compilação
  /*
  @Get(':id/workouts')
  getUserWorkouts(@Param('id') id: string) {
    return this.usersService.getUserWorkouts(id);
  }
  */
}