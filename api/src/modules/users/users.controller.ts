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
import { PrismaService } from '../../infra/database/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

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

  // Exportação completa do prontuário para PDF — todas as informações em uma chamada
  @Roles('PERSONAL', 'NUTRITIONIST', 'PHYSIO', 'ADMIN')
  @Get(':id/export')
  async exportPatient(@Request() req, @Param('id') id: string) {
    const [patient, activeDiet, activeWorkout, activeRehab, lastAssessment, lastLabExam, lastAnamnesis] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id },
          select: {
            id: true, name: true, email: true, phone: true,
            birthDate: true, gender: true, goal: true,
            height: true, initialWeight: true,
            allergies: true, pathologies: true,
            exerciseType: true, exerciseFrequency: true,
            createdAt: true,
          },
        }),
        this.prisma.dietPlan.findFirst({
          where: { userId: id, isActive: true },
          include: {
            meals: {
              include: {
                items: { include: { food: { select: { name: true, kcal: true, protein: true, carbs: true, fat: true } } } },
              },
              orderBy: { time: 'asc' },
            },
            creator: { select: { name: true, role: true } },
          },
        }),
        this.prisma.workout.findFirst({
          where: { userId: id, isActive: true },
          include: {
            splits: {
              include: { exercises: true },
            },
            creator: { select: { name: true, role: true } },
          },
        }),
        this.prisma.rehabPlan.findFirst({
          where: { userId: id, isActive: true },
          include: {
            sessions: {
              include: { exercises: true },
            },
            creator: { select: { name: true, role: true } },
          },
        }),
        this.prisma.physicalAssessment.findFirst({
          where: { userId: id },
          orderBy: { date: 'desc' },
        }),
        this.prisma.labExam.findFirst({
          where: { patientId: id },
          orderBy: { date: 'desc' },
          include: { markers: { orderBy: { name: 'asc' } } },
        }),
        this.prisma.anamnesis.findFirst({
          where: { patientId: id },
          orderBy: { createdAt: 'desc' },
          select: {
            clinicalHistory: true,
            medications: true,
            pathologies: true,
            symptoms: true,
            familyHistory: true,
            bowelMovement: true,
            waterIntake: true,
            alcoholAndSmoking: true,
            createdAt: true,
          },
        }),
      ]);

    if (!patient) throw new NotFoundException('Paciente não encontrado');

    return {
      exportedAt: new Date().toISOString(),
      patient,
      activeDiet,
      activeWorkout,
      activeRehab,
      lastAssessment,
      lastLabExam,
      lastAnamnesis,
    };
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