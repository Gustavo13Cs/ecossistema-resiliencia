import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';

@Injectable()
export class LabExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, data: CreateLabExamDto) {
    this.assertNutritionist(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.labExam.create({
      data: {
        date: new Date(data.date),
        notes: data.notes,
        clientId: client.id,
        patientId: null,
        creatorId: user.sub,
        markers: {
          create: data.markers.map((marker) => ({
            name: marker.name,
            value: marker.value,
            unit: marker.unit,
          })),
        },
      },
    });
  }

  async findByClient(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.labExam.findMany({
      where: { clientId, creatorId: user.sub },
      orderBy: { date: 'asc' },
      include: { markers: true },
    });
  }

  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
