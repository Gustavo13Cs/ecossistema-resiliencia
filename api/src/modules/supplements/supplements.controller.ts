import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('supplements')
export class SupplementsController {
  constructor(private service: SupplementsService) {}
  @Post()
  create(@Request() req, @Body() body: any) { return this.service.create(body, req.user.sub); }
  @Get('user/:patientId/active')
  findActive(@Param('patientId') id: string) { return this.service.findActiveByUser(id); }
}