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

  async getPatientOverview(patientId: string, professionalId: string) {
    // Busca em paralelo para máxima performance
    const [
      patient,
      activeDiet,
      activeWorkout,
      activeRehab,
      assessments,
      latestLabExam,
      activeAlerts,
      latestPhysioAssessment,
    ] = await Promise.all([
      // Dados básicos do paciente
      this.prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true, name: true, goal: true, allergies: true,
          pathologies: true, height: true, initialWeight: true,
          gender: true, birthDate: true,
        },
      }),

      // Plano de dieta ativo
      this.prisma.dietPlan.findFirst({
        where: { userId: patientId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, goal: true, targetKcal: true,
          proteinG: true, carbsG: true, fatG: true,
          createdAt: true,
          creator: { select: { name: true, role: true } },
        },
      }),

      // Plano de treino ativo
      this.prisma.workout.findFirst({
        where: { userId: patientId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, goal: true, durationWeeks: true,
          createdAt: true,
          creator: { select: { name: true, role: true } },
          splits: {
            select: { id: true, name: true, focus: true },
            take: 5,
          },
        },
      }),

      // Plano de reabilitação ativo
      this.prisma.rehabPlan.findFirst({
        where: { userId: patientId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, goal: true, durationWeeks: true,
          createdAt: true,
          creator: { select: { name: true, role: true } },
        },
      }),

      // Últimas 2 avaliações físicas (para calcular delta)
      this.prisma.physicalAssessment.findMany({
        where: { userId: patientId },
        orderBy: { date: 'desc' },
        take: 2,
        select: {
          id: true, date: true, weight: true, bodyFat: true,
          muscleMass: true, waist: true, abdomen: true,
        },
      }),

      // Último exame laboratorial com marcadores
      this.prisma.labExam.findFirst({
        where: { patientId },
        orderBy: { date: 'desc' },
        select: {
          id: true, date: true, notes: true,
          markers: {
            select: { id: true, name: true, value: true, unit: true },
            take: 6,
          },
        },
      }),

      // Alertas ativos para este paciente (enviados pelo profissional logado)
      this.prisma.patientAlert.findMany({
        where: { patientId, professionalId },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true, type: true, severity: true, message: true, createdAt: true,
        },
      }),

      // Última avaliação fisioterapêutica (para detecção de conflito)
      this.prisma.physioAssessment.findFirst({
        where: { userId: patientId },
        orderBy: { date: 'desc' },
        select: {
          id: true, date: true, painLevel: true, chiefComplaint: true,
        },
      }),
    ]);

    // Monta a timeline com eventos recentes de todas as áreas
    const timelineEvents: { label: string; date: Date; type: string; author: string }[] = [];

    if (activeDiet) {
      timelineEvents.push({
        label: `Plano alimentar: "${activeDiet.title}"`,
        date: activeDiet.createdAt,
        type: 'DIET',
        author: activeDiet.creator?.name || 'Nutricionista',
      });
    }
    if (activeWorkout) {
      timelineEvents.push({
        label: `Treino prescrito: "${activeWorkout.title}"`,
        date: activeWorkout.createdAt,
        type: 'WORKOUT',
        author: activeWorkout.creator?.name || 'Personal Trainer',
      });
    }
    if (activeRehab) {
      timelineEvents.push({
        label: `Plano de reabilitação: "${activeRehab.title}"`,
        date: activeRehab.createdAt,
        type: 'REHAB',
        author: activeRehab.creator?.name || 'Fisioterapeuta',
      });
    }
    if (assessments[0]) {
      timelineEvents.push({
        label: `Avaliação física: ${assessments[0].weight ? `${assessments[0].weight}kg` : 'registrada'}`,
        date: assessments[0].date,
        type: 'ASSESSMENT',
        author: 'Profissional',
      });
    }
    if (latestLabExam) {
      timelineEvents.push({
        label: `Exames laboratoriais registrados`,
        date: latestLabExam.date,
        type: 'LAB',
        author: 'Nutricionista',
      });
    }
    if (latestPhysioAssessment) {
      timelineEvents.push({
        label: `Avaliação fisioterapêutica${latestPhysioAssessment.painLevel != null ? ` — Dor EVA ${latestPhysioAssessment.painLevel}/10` : ''}`,
        date: latestPhysioAssessment.date,
        type: 'PHYSIO',
        author: 'Fisioterapeuta',
      });
    }

    // Ordena por data desc e pega os 8 mais recentes
    const recentTimeline = timelineEvents
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    // Detecção de possível conflito: dor alta + treino ativo recente
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const hasHighPain = latestPhysioAssessment?.painLevel != null && latestPhysioAssessment.painLevel >= 7;
    const hasRecentAssessmentOrWorkout =
      (assessments[0] && new Date(assessments[0].date) >= threeDaysAgo) ||
      (activeWorkout && new Date(activeWorkout.createdAt) >= threeDaysAgo);

    const conflictWarning =
      hasHighPain && hasRecentAssessmentOrWorkout
        ? {
            message: `Dor EVA ${latestPhysioAssessment.painLevel}/10 registrada pela Fisio em ${new Date(latestPhysioAssessment.date).toLocaleDateString('pt-BR')} e há atividade física ativa no mesmo período.`,
            physioDate: latestPhysioAssessment.date,
            painLevel: latestPhysioAssessment.painLevel,
          }
        : null;

    // Calcula variação de peso
    const latestAssessment = assessments[0] ?? null;
    const previousAssessment = assessments[1] ?? null;
    const weightDelta =
      latestAssessment?.weight && previousAssessment?.weight
        ? parseFloat((latestAssessment.weight - previousAssessment.weight).toFixed(1))
        : null;

    return {
      patient,
      activeDietPlan: activeDiet,
      activeWorkout,
      activeRehabPlan: activeRehab,
      latestAssessment,
      previousAssessment,
      weightDelta,
      latestLabExam,
      activeAlerts,
      latestPhysioAssessment,
      conflictWarning,
      recentTimeline,
    };
  }
}