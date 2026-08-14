import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto';

@Injectable()
export class WorkoutLogsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, dto: CreateWorkoutLogDto) {
    // Verifica se o workout pertence ao paciente
    const workout = await this.prisma.workout.findFirst({
      where: { id: dto.workoutId, userId: patientId },
    });
    if (!workout) throw new NotFoundException('Treino não encontrado ou não pertence a você');

    // Cria o log de sessão e as séries em uma única transação
    const log = await this.prisma.workoutLog.create({
      data: {
        workoutId: dto.workoutId,
        splitId: dto.splitId,
        patientId,
        pse: dto.pse,
        notes: dto.notes,
        sets: {
          create: dto.sets.map((s) => ({
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            repsActual: s.repsActual,
            weightKg: s.weightKg,
          })),
        },
      },
      include: {
        split: { select: { name: true } },
        sets: { include: { exercise: { select: { name: true } } } },
      },
    });

    // Registra automaticamente no DailyTracking para manter a consistência
    await this.prisma.dailyTracking.create({
      data: {
        patientId,
        type: 'WORKOUT',
        itemName: log.split.name,
      },
    });

    return log;
  }

  async findByPatient(patientId: string, requesterId: string, requesterRole: string) {
    // Paciente vê somente os próprios logs
    if (requesterRole === 'PATIENT' && patientId !== requesterId) {
      throw new ForbiddenException('Acesso negado');
    }

    // Personal verifica vínculo com o paciente
    if (requesterRole === 'PERSONAL') {
      const link = await this.prisma.professionalPatientLink.findUnique({
        where: {
          professionalId_patientId: { professionalId: requesterId, patientId },
        },
      });
      if (!link || !link.isActive) throw new ForbiddenException('Paciente não vinculado');
    }

    return this.prisma.workoutLog.findMany({
      where: { patientId },
      orderBy: { executedAt: 'desc' },
      take: 30, // últimos 30 logs
      include: {
        workout: { select: { title: true } },
        split: { select: { name: true, focus: true } },
        sets: {
          include: { exercise: { select: { name: true } } },
          orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
        },
      },
    });
  }

  // Evolução de carga de um exercício específico — para o gráfico do personal
  async getExerciseProgress(exerciseId: string, patientId: string) {
    const sets = await this.prisma.workoutLogSet.findMany({
      where: {
        exerciseId,
        log: { patientId },
        weightKg: { not: null },
      },
      orderBy: { log: { executedAt: 'asc' } },
      include: { log: { select: { executedAt: true } } },
    });

    // Agrupa por sessão: pega o maior peso de cada sessão
    const progressBySession: Record<string, { date: Date; maxWeight: number }> = {}
    for (const s of sets) {
      const sessionId = s.logId;
      if (!progressBySession[sessionId] || (s.weightKg ?? 0) > progressBySession[sessionId].maxWeight) {
        progressBySession[sessionId] = { date: s.log.executedAt, maxWeight: s.weightKg ?? 0 };
      }
    }

    return Object.values(progressBySession).sort(
      (a: { date: Date; maxWeight: number }, b: { date: Date; maxWeight: number }) =>
        a.date.getTime() - b.date.getTime(),
    );
  }
}
