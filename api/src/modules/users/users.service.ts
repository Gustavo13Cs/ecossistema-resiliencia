import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, canAccessClinicalFields: boolean) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        birthDate: true,
        height: true,
        initialWeight: true,
        goal: true,
        allergies: true,
        pathologies: true,
        typicalSleep: true,
        stressLevel: true,
        foodRelationship: true,
        psychologyHistory: true,
        exerciseType: true,
        exerciseFrequency: true,
        exerciseDuration: true,
        workActivityLevel: true,
        role: true,
        createdAt: true,
        tmb: true,
        get: true,
        activityFactor: true,
        nutritionistNotes: canAccessClinicalFields,
      },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    canUpdateClinicalFields: boolean,
  ) {
    const {
      nutritionistNotes,
      tmb,
      get,
      activityFactor,
      ...nonClinicalFields
    } = updateUserDto;
    const data = canUpdateClinicalFields
      ? { ...nonClinicalFields, nutritionistNotes, tmb, get, activityFactor }
      : nonClinicalFields;

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        birthDate: true,
        updatedAt: true,
      },
    });
  }
}
