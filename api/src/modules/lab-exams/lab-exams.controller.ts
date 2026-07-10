import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { LabExamsService } from './lab-exams.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lab-exams')
export class LabExamsController {
  constructor(private readonly labExamsService: LabExamsService) {}

  @Post()
  create(@Request() req, @Body() createLabExamDto: CreateLabExamDto) {
    return this.labExamsService.create(createLabExamDto, req.user.sub);
  }

  @Get('user/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.labExamsService.findByPatient(patientId);
  }
}