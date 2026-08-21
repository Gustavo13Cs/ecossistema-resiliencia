import {
  Controller, Post, Body, Get, Param,
  Patch, Delete, Request, UseGuards,
} from '@nestjs/common';
import { ConsultationNotesService } from './consultation-notes.service';
import { CreateConsultationNoteDto } from './dto/create-consultation-note.dto';
import { UpdateConsultationNoteDto } from './dto/update-consultation-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consultation-notes')
export class ConsultationNotesController {
  constructor(private readonly service: ConsultationNotesService) {}

  @Roles('NUTRITIONIST', 'ADMIN')
  @Post()
  create(@Request() req, @Body() dto: CreateConsultationNoteDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Roles('NUTRITIONIST', 'ADMIN')
  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Roles('NUTRITIONIST', 'ADMIN')
  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationNoteDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Roles('NUTRITIONIST', 'ADMIN')
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(id, req.user.sub);
  }
}
