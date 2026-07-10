// api/src/modules/users/users.service.ts

import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, professionalId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // usuário já existe: só vincula, não sobrescreve dados
      await this.prisma.professionalPatientLink.upsert({
        where: {
          professionalId_patientId: {
            professionalId,
            patientId: existingUser.id,
          },
        },
        update: { isActive: true },
        create: { professionalId, patientId: existingUser.id },
      });

      return { id: existingUser.id, email: existingUser.email, linked: true };
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // destruturação explícita — nunca spread direto de DTO no Prisma
    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        phone: createUserDto.phone,
        birthDate: createUserDto.birthDate,
        gender: createUserDto.gender,
        goal: createUserDto.goal,
        height: createUserDto.height,
        initialWeight: createUserDto.initialWeight,
        allergies: createUserDto.allergies,
        pathologies: createUserDto.pathologies,
        typicalSleep: createUserDto.typicalSleep,
        stressLevel: createUserDto.stressLevel,
        foodRelationship: createUserDto.foodRelationship,
        psychologyHistory: createUserDto.psychologyHistory,
        exerciseType: createUserDto.exerciseType,
        exerciseFrequency: createUserDto.exerciseFrequency,
        exerciseDuration: createUserDto.exerciseDuration,
        workActivityLevel: createUserDto.workActivityLevel,
        role: 'PATIENT', // sempre PATIENT, ignorando qualquer role que vier no DTO
        professionals: {
          create: { professionalId },
        },
      },
      select: {
        id: true, name: true, email: true,
        phone: true, role: true, createdAt: true,
      },
    });

    return newUser;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true, phone: true,
        birthDate: true, gender: true, goal: true,
        height: true, initialWeight: true, allergies: true,
        pathologies: true, typicalSleep: true, stressLevel: true,
        foodRelationship: true, psychologyHistory: true,
        exerciseType: true, exerciseFrequency: true, exerciseDuration: true,
        // nutritionistNotes fora — isso é dado clínico do profissional
      },
    });
  }

  async findAll(professionalId: string) {
    const links = await this.prisma.professionalPatientLink.findMany({
      where: { professionalId, isActive: true },
      include: {
        patient: {
          select: {
            id: true, name: true, email: true,
            phone: true, role: true, createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => link.patient);
  }

  async findOne(id: string, isProfessional: boolean) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true,
        gender: true, birthDate: true, height: true,
        initialWeight: true, goal: true, allergies: true,
        pathologies: true, typicalSleep: true, stressLevel: true,
        foodRelationship: true, psychologyHistory: true,
        exerciseType: true, exerciseFrequency: true,
        exerciseDuration: true, workActivityLevel: true,
        role: true, createdAt: true, tmb: true,
        get: true, activityFactor: true,
        // notas clínicas só para profissionais
        nutritionistNotes: isProfessional,
      },
    });
  }

  async update(id: string, data: UpdateUserDto, isProfessional: boolean) {
    // pacientes não podem alterar campos clínicos
    if (!isProfessional) {
      delete (data as any).nutritionistNotes;
      delete (data as any).tmb;
      delete (data as any).get;
      delete (data as any).activityFactor;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, phone: true,
        gender: true, birthDate: true, updatedAt: true,
      },
    });
  }

  async unlinkPatient(professionalId: string, patientId: string) {
    return this.prisma.professionalPatientLink.update({
      where: {
        professionalId_patientId: { professionalId, patientId },
      },
      data: { isActive: false },
    });
  }
}