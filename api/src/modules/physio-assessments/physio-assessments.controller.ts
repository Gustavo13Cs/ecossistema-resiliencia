import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PhysioAssessmentsService } from './physio-assessments.service';
import { CreatePhysioAssessmentDto } from './dto/create-physio-assessment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('physio-assessments')
export class PhysioAssessmentsController {
  constructor(private readonly service: PhysioAssessmentsService) {}

  @Post()
  create(@Body() dto: CreatePhysioAssessmentDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.service.findAllByProfessional(req.user.sub);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}