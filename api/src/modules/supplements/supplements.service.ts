import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateSupplementDto } from './dto/create-supplement.dto';

@Injectable()
export class SupplementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(user: AuthUser, data: CreateSupplementDto) {
    this.assertNutritionist(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.supplementPlan.create({
      data: {
        title: data.title,
        notes: data.notes,
        clientId: client.id,
        patientId: null,
        creatorId: user.sub,
        items: {
          create: data.items.map((item) => ({
            name: item.name,
            composition: item.composition,
            dosage: item.dosage,
            instructions: item.instructions,
          })),
        },
      },
    });
  }

  async findActive(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.supplementPlan.findFirst({
      where: { clientId, creatorId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
