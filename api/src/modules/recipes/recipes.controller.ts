import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthUser } from '../../common/types/auth-user';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

type AuthenticatedRequest = { user: AuthUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListRecipesQueryDto,
  ) {
    return this.recipesService.list(query, request.user.sub);
  }

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.recipesService.create(dto, request.user.sub);
  }

  @Get(':id')
  findOne(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.recipesService.findOne(id, request.user.sub);
  }

  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(id, dto, request.user.sub);
  }

  @Post(':id/duplicate')
  duplicate(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.recipesService.duplicate(id, request.user.sub);
  }

  @Patch(':id/archive')
  archive(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.recipesService.archive(id, request.user.sub);
  }

  @Patch(':id/restore')
  restore(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.recipesService.restore(id, request.user.sub);
  }
}
