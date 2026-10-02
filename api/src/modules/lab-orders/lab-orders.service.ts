import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
@Injectable()
export class LabOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}
  async list(user: AuthUser) {
    this.assertNutritionist(user);
    return this.prisma.labOrder.findMany({
      where: { professionalId: user.sub, client: { professionalId: user.sub } },
      orderBy: { issuedAt: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    });
  }
  async create(user: AuthUser, dto: CreateLabOrderDto) {
    this.assertNutritionist(user);
    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    return this.prisma.labOrder.create({
      data: {
        clientId: client.id,
        professionalId: user.sub,
        title: dto.title,
        markers: dto.markers,
        clinicalIndication: dto.clinicalIndication,
        preparationInstructions: dto.preparationInstructions,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }
  async remove(user: AuthUser, id: string) {
    this.assertNutritionist(user);
    const metadata = await this.prisma.labOrder.findFirst({
      where: { id, professionalId: user.sub },
      select: { clientId: true },
    });
    if (!metadata) throw new NotFoundException('Pedido não encontrado');
    await this.clientAccess.getOwnedClient(user, metadata.clientId);
    const { count } = await this.prisma.labOrder.deleteMany({
      where: { id, professionalId: user.sub, clientId: metadata.clientId },
    });
    if (!count) throw new NotFoundException('Pedido não encontrado');
    return { deleted: true };
  }
  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
