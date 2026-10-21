import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClinicalResponse } from '../../common/decorators/clinical-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DOMAIN_ROLES } from '../../common/policies/professional-domain-roles';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import {
  CreateWorkoutDraftDto,
  DraftListQueryDto,
  DraftVersionDto,
  RebaseWorkoutDraftDto,
  SaveWorkoutDraftDto,
} from './dto/workout-draft.dto';
import { WorkoutDraftsService } from './workout-drafts.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.training)
@Controller('workouts/drafts')
export class WorkoutDraftsController {
  constructor(private readonly drafts: WorkoutDraftsService) {}

  @ClinicalResponse({ shape: 'resource-page' })
  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: DraftListQueryDto,
  ) {
    return this.drafts.list(request.user, query);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateWorkoutDraftDto,
  ) {
    return this.drafts.create(request.user, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Get(':draftId')
  get(
    @Request() request: AuthenticatedRequest,
    @Param('draftId', ParseUUIDPipe) id: string,
  ) {
    return this.drafts.get(request.user, id);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Put(':draftId')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('draftId', ParseUUIDPipe) id: string,
    @Body() dto: SaveWorkoutDraftDto,
  ) {
    return this.drafts.update(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post(':draftId/rebase')
  rebase(
    @Request() request: AuthenticatedRequest,
    @Param('draftId', ParseUUIDPipe) id: string,
    @Body() dto: RebaseWorkoutDraftDto,
  ) {
    return this.drafts.rebase(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'resource' })
  @Post(':draftId/finalize')
  finalize(
    @Request() request: AuthenticatedRequest,
    @Param('draftId', ParseUUIDPipe) id: string,
    @Body() dto: DraftVersionDto,
  ) {
    return this.drafts.finalize(request.user, id, dto);
  }

  @ClinicalResponse({ shape: 'ack' })
  @Post(':draftId/discard')
  discard(
    @Request() request: AuthenticatedRequest,
    @Param('draftId', ParseUUIDPipe) id: string,
    @Body() dto: DraftVersionDto,
  ) {
    return this.drafts.discard(request.user, id, dto);
  }
}
