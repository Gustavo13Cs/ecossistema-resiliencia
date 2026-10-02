import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedRequest,
  AuthUser,
  CLINICAL_PROFESSIONAL_ROLES,
} from '../../common/types/auth-user';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    this.assertSelf(request.user, id, 'Acesso negado');
    const canAccessClinicalFields =
      CLINICAL_PROFESSIONAL_ROLES.includes(request.user.role) ||
      request.user.role === 'ADMIN';

    return this.usersService.findOne(id, canAccessClinicalFields);
  }

  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.assertSelf(
      request.user,
      id,
      'Você não pode editar dados de outro usuário',
    );
    const canUpdateClinicalFields =
      CLINICAL_PROFESSIONAL_ROLES.includes(request.user.role) ||
      request.user.role === 'ADMIN';

    return this.usersService.update(id, updateUserDto, canUpdateClinicalFields);
  }

  private assertSelf(user: AuthUser, requestedUserId: string, message: string) {
    if (user.sub !== requestedUserId) {
      throw new ForbiddenException(message);
    }
  }
}
