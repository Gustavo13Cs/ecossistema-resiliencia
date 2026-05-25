import { Controller, Post, Body, Get, UseGuards, Request, Param, Delete, Query, NotFoundException,Put,Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

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

 @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

}