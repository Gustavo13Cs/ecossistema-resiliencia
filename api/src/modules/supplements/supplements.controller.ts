import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthUser } from '../../common/types/auth-user';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('supplements')
export class SupplementsController {
  constructor(private service: SupplementsService) {}
  @Post()
  create(@Request() request: AuthenticatedRequest, @Body() body: any) {
    return this.service.create(body, request.user.sub);
  }
  @Get('user/:patientId/active')
  findActive(@Param('patientId') id: string) {
    return this.service.findActiveByUser(id);
  }
}
