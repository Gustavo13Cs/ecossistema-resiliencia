import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConsentCategory } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { ConsentsService } from './consents.service';
import { UpdateConsentDto } from './dto/update-consent.dto';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get('me')
  listMine(@Request() req: AuthenticatedRequest) {
    return this.consentsService.listMine(req.user);
  }

  @Put(':professionalId/:category')
  setMine(
    @Request() req: AuthenticatedRequest,
    @Param('professionalId') professionalId: string,
    @Param('category', new ParseEnumPipe(ConsentCategory))
    category: ConsentCategory,
    @Body() dto: UpdateConsentDto,
  ) {
    return this.consentsService.setMine(
      req.user,
      professionalId,
      category,
      dto,
    );
  }
}
