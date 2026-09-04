import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnamnesesService } from './anamneses.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthUser } from '../../common/types/auth-user';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('anamneses')
export class AnamnesesController {
  constructor(private readonly anamnesesService: AnamnesesService) {}

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createDto: CreateAnamnesisDto,
  ) {
    return this.anamnesesService.create(createDto, request.user.sub);
  }

  @Get('user/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.anamnesesService.findByPatient(patientId);
  }
}
