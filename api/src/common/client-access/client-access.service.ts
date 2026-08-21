import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthUser, CLINICAL_PROFESSIONAL_ROLES } from '../types/auth-user';

@Injectable()
export class ClientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnedClient(user: AuthUser, clientId: string): Promise<Client> {
    if (!CLINICAL_PROFESSIONAL_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Acesso permitido somente a profissional clínico',
      );
    }

    const client = await this.prisma.client.findFirst({
      where: { id: clientId, professionalId: user.sub },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }
}
