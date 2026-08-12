import {
  Controller, Post, Body, Get, Param,
  Delete, Query, NotFoundException, Patch,
  Request, ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UseGuards } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Só PERSONAL, NUTRITIONIST e ADMIN podem buscar por email
  @Roles('PERSONAL', 'NUTRITIONIST', 'ADMIN')
  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  // Só profissionais criam pacientes
  @Roles('PERSONAL', 'NUTRITIONIST', 'ADMIN')
  @Post()
  create(@Request() req, @Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto, req.user.sub);
  }

  // Lista apenas os pacientes vinculados ao profissional logado
  @Roles('PERSONAL', 'NUTRITIONIST', 'ADMIN')
  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.sub);
  }

  // Visão 360°: dados agregados de todas as áreas do paciente
  @Get(':id/overview')
  getPatientOverview(@Request() req, @Param('id') id: string) {
    return this.usersService.getPatientOverview(id, req.user.sub);
  }

  // Profissional vê perfil completo; paciente vê só o próprio (sem notas clínicas)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const isProfessional = ['PERSONAL', 'NUTRITIONIST', 'ADMIN'].includes(req.user.role);

    if (!isProfessional && req.user.sub !== id) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.usersService.findOne(id, isProfessional);
  }

  // Só o próprio paciente ou profissional vinculado pode atualizar
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const isProfessional = ['PERSONAL', 'NUTRITIONIST', 'ADMIN'].includes(req.user.role);

    if (!isProfessional && req.user.sub !== id) {
      throw new ForbiddenException('Você não pode editar dados de outro usuário');
    }

    return this.usersService.update(id, updateUserDto, isProfessional);
  }

  @Roles('PERSONAL', 'NUTRITIONIST', 'ADMIN')
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.usersService.unlinkPatient(req.user.sub, id);
  }
}