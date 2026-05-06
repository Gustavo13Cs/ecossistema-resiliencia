import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { CreateRehabPlanDto } from './dto/create-rehab-plan.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard) 
@Controller('rehab-plans')
export class RehabPlansController {
  constructor(private readonly service: RehabPlansService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateRehabPlanDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.service.findAllByProfessional(req.user.sub);
  }

  @Get('user/:userId/active')
  findActiveByUser(@Param('userId') userId: string) {
    return this.service.findActiveByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}