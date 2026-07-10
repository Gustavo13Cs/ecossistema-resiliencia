import { Controller, Get, Post, Body, Param, Delete, UseGuards,Request } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard) 
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

  @Get()
  findAll(@Request() req) {
    return this.assessmentsService.findAll(req.user.sub);
  }
}