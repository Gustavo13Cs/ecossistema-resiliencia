import { Module } from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { RehabPlansController } from './rehab-plans.controller';
import { PhysioReadService } from './physio-read.service';
import { PhysioSessionEvolutionsService } from './physio-session-evolutions.service';
import { PhysioSessionEvolutionsController } from './physio-session-evolutions.controller';
import { PhysioFunctionalScalesService } from './physio-functional-scales.service';
import { PhysioFunctionalScalesController } from './physio-functional-scales.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [
    RehabPlansController,
    PhysioSessionEvolutionsController,
    PhysioFunctionalScalesController,
  ],
  providers: [
    RehabPlansService,
    PhysioReadService,
    PhysioSessionEvolutionsService,
    PhysioFunctionalScalesService,
  ],
})
export class RehabPlansModule {}
