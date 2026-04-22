import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard) 
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  create(@Body() createAssessmentDto: CreateAssessmentDto) {
    return this.assessmentsService.create(createAssessmentDto);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.assessmentsService.findByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessmentsService.remove(id);
  }
}