import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AnamnesesService } from './anamneses.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('anamneses')
export class AnamnesesController {
  constructor(private readonly anamnesesService: AnamnesesService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateAnamnesisDto) {
    return this.anamnesesService.create(createDto, req.user.sub);
  }

  @Get('user/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.anamnesesService.findByPatient(patientId);
  }
}