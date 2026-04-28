import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: any, professionalId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      const { password, ...dataToUpdate } = createUserDto; 
      
      const updatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: dataToUpdate,
      });

      await this.prisma.professionalPatientLink.upsert({
        where: {
          professionalId_patientId: {
            professionalId: professionalId,
            patientId: existingUser.id,
          }
        },
        update: { isActive: true }, 
        create: {
          professionalId: professionalId,
          patientId: existingUser.id,
        }
      });
      return updatedUser;
    }

    // SE O PACIENTE NÃO EXISTE: Cria do zero com senha
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: 'PATIENT',
        professionals: {
          create: { professionalId: professionalId }
        }
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true, phone: true, birthDate: true, gender: true,
        goal: true, height: true, initialWeight: true, allergies: true, pathologies: true,
        typicalSleep: true, stressLevel: true, foodRelationship: true, psychologyHistory: true,
        exerciseType: true, exerciseFrequency: true, exerciseDuration: true, hasPersonal: true
      } 
    });
  }

  async findAll(professionalId: string) {
    const links = await this.prisma.professionalPatientLink.findMany({
      where: { 
        professionalId: professionalId,
        isActive: true
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true, 
            role: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map(link => link.patient);
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id: id },
    });
  }

  async unlinkPatient(professionalId: string, patientId: string) {
    return this.prisma.professionalPatientLink.update({
      where: {
        professionalId_patientId: {
          professionalId: professionalId,
          patientId: patientId,
        },
      },
      data: {
        isActive: false, 
      },
    });
  }

  async update(id: string, data: any) {
    const { id: _, email, password, role, professionals, createdAt, updatedAt, ...updateData } = data;
    
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  // ⚠️ DESATIVADO TEMPORARIAMENTE: Pois removemos o WorkoutLog do schema!
  /*
  async getUserWorkouts(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
  */
}