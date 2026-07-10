import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async getProfessionalAlerts(@Request() req) {
    // Busca os alertas vinculados ao ID do profissional logado
    // O JWT garante que um personal não veja os alertas de outro
    return this.prisma.patientAlert.findMany({
      where: { professionalId: req.user.sub },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: [
        { severity: 'asc' }, // HIGH primeiro
        { createdAt: 'desc' }
      ]
    });
  }
}