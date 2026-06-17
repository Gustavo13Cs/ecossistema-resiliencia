import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { LabExamsService } from './lab-exams.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
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