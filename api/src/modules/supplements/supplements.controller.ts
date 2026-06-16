import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('supplements')
export class SupplementsController {
  constructor(private service: SupplementsService) {}
  @Post()
  create(@Request() req, @Body() body: any) { return this.service.create(body, req.user.sub); }
  @Get('user/:patientId/active')
  findActive(@Param('patientId') id: string) { return this.service.findActiveByUser(id); }
}