import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { ExerciseLibraryService } from './exercise-library.service';
import { SAFEMOVE_EXERCISE_CATALOG } from './exercise-catalog';

describe('ExerciseLibraryService', () => {
  const user: AuthUser = { sub: 'personal-1', role: 'PERSONAL' };
  const prisma = {
    customExercise: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new ExerciseLibraryService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.customExercise.findMany.mockResolvedValue([]);
    prisma.customExercise.findFirst.mockResolvedValue(null);
  });

  it('lists custom exercises first followed by the versioned SafeMove catalog', async () => {
    prisma.customExercise.findMany.mockResolvedValue([
      {
        id: 'custom-1',
        name: 'Agachamento pausa 2s',
        muscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
        notes: 'Pausa no fundo',
      },
    ]);

    const items = await service.list(user);

    expect(prisma.customExercise.findMany).toHaveBeenCalledWith({
      where: { professionalId: user.sub },
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        equipment: true,
        notes: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    expect(items[0]).toEqual({
      id: 'custom-1',
      name: 'Agachamento pausa 2s',
      muscleGroup: 'QUADRICEPS',
      equipment: 'BARBELL',
      notes: 'Pausa no fundo',
      source: 'CUSTOM',
    });
    expect(items.length).toBe(1 + SAFEMOVE_EXERCISE_CATALOG.length);
  });

  it('filters catalog and custom exercises by accent-insensitive query and muscleGroup', async () => {
    const items = await service.list(user, {
      q: 'bulgaro',
      muscleGroup: 'QUADRICEPS',
    });

    expect(prisma.customExercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          professionalId: user.sub,
          muscleGroup: 'QUADRICEPS',
          normalizedName: { contains: 'bulgaro' },
        },
      }),
    );
    expect(items).toEqual([
      expect.objectContaining({
        name: 'Agachamento búlgaro com halteres',
        muscleGroup: 'QUADRICEPS',
        source: 'CATALOG',
      }),
    ]);
  });

  it('creates a professional-owned custom exercise with normalized name', async () => {
    prisma.customExercise.create.mockResolvedValue({
      id: 'custom-2',
      name: 'Remada Pêndulo Unilateral',
      muscleGroup: 'BACK',
      equipment: 'MACHINE',
      notes: 'Cotovelo rente ao tronco',
    });

    const created = await service.create(user, {
      name: '  Remada   Pêndulo Unilateral ',
      muscleGroup: 'BACK',
      equipment: 'MACHINE',
      notes: ' Cotovelo rente ao tronco ',
    });

    expect(prisma.customExercise.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: user.sub,
        normalizedName: 'remada pendulo unilateral',
      },
      select: { id: true },
    });
    expect(prisma.customExercise.create).toHaveBeenCalledWith({
      data: {
        professionalId: user.sub,
        name: 'Remada Pêndulo Unilateral',
        normalizedName: 'remada pendulo unilateral',
        muscleGroup: 'BACK',
        equipment: 'MACHINE',
        notes: 'Cotovelo rente ao tronco',
      },
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        equipment: true,
        notes: true,
      },
    });
    expect(created).toEqual({
      id: 'custom-2',
      name: 'Remada Pêndulo Unilateral',
      muscleGroup: 'BACK',
      equipment: 'MACHINE',
      notes: 'Cotovelo rente ao tronco',
      source: 'CUSTOM',
    });
  });

  it('rejects duplicate custom exercise names for the same professional', async () => {
    prisma.customExercise.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(user, {
        name: 'Supino Reto Pausa',
        muscleGroup: 'CHEST',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.customExercise.create).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only custom exercise names', async () => {
    await expect(
      service.create(user, {
        name: '   ',
        muscleGroup: 'CHEST',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.customExercise.create).not.toHaveBeenCalled();
  });

  it('removes only an owned custom exercise and returns 404 for unknown/foreign ids', async () => {
    prisma.customExercise.findFirst.mockResolvedValueOnce({ id: 'custom-1' });
    prisma.customExercise.delete.mockResolvedValueOnce({ id: 'custom-1' });

    await expect(service.remove(user, 'custom-1')).resolves.toEqual({
      id: 'custom-1',
    });
    expect(prisma.customExercise.findFirst).toHaveBeenCalledWith({
      where: { id: 'custom-1', professionalId: user.sub },
      select: { id: true },
    });
    expect(prisma.customExercise.delete).toHaveBeenCalledWith({
      where: { id: 'custom-1' },
    });

    prisma.customExercise.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove(user, 'foreign-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['ADMIN', 'PATIENT', 'NUTRITIONIST', 'PHYSIO'] as const)(
    'denies %s before any database access',
    async (role) => {
      const denied: AuthUser = { sub: user.sub, role };
      await expect(service.list(denied)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.create(denied, { name: 'Teste', muscleGroup: 'CHEST' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove(denied, 'custom-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.customExercise.findMany).not.toHaveBeenCalled();
      expect(prisma.customExercise.findFirst).not.toHaveBeenCalled();
      expect(prisma.customExercise.create).not.toHaveBeenCalled();
      expect(prisma.customExercise.delete).not.toHaveBeenCalled();
    },
  );
});
