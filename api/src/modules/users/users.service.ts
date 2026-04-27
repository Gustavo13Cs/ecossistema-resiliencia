import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: any, professionalId: string) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 🌟 MÁGICA: Cria o Paciente e já cria o Vínculo com o Profissional na mesma hora!
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: 'PATIENT',
        professionals: {
          create: {
            professionalId: professionalId
          }
        }
      },
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