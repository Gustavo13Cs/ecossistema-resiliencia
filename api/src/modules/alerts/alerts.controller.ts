import { Controller, Get, UseGuards, Request, Header } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PERSONAL')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  getProfessionalAlerts(@Request() req: { user: AuthUser }) {
    return this.prisma.patientAlert.findMany({
      where: {
        professionalId: req.user.sub,
        client: { professionalId: req.user.sub, status: 'ACTIVE' },
      },
      include: { client: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
