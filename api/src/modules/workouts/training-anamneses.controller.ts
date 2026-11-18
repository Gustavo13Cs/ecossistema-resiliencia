import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import { CreateTrainingAnamnesisDto } from './dto/training-anamnesis.dto';
import { TrainingAnamnesesService } from './training-anamneses.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PERSONAL')
@Controller('workouts/anamneses')
export class TrainingAnamnesesController {
  constructor(private readonly anamneses: TrainingAnamnesesService) {}

  @ClinicalResponse({ shape: 'resource' })
  @Get('client/:clientId')
  listByClient(
    @Request() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.anamneses.listByClient(request.user, clientId);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateTrainingAnamnesisDto,
  ) {
    return this.anamneses.create(request.user, dto);
  }
}
