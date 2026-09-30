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
import { CreateSupplementDto } from './dto/create-supplement.dto';
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
  create(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateSupplementDto,
  ) {
    return this.service.create(request.user, body);
  }
  @Get('client/:clientId/active')
  findActive(
    @Request() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
  ) {
    return this.service.findActive(request.user, clientId);
  }
}
