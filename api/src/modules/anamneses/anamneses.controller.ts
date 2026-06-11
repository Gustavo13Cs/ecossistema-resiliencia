import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AnamnesesService } from './anamneses.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
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