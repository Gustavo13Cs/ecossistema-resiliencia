import { Module } from '@nestjs/common';
import { RehabPlansService } from './rehab-plans.service';
import { RehabPlansController } from './rehab-plans.controller';
import { PhysioReadService } from './physio-read.service';
import { PhysioSessionEvolutionsService } from './physio-session-evolutions.service';
import { PhysioSessionEvolutionsController } from './physio-session-evolutions.controller';
import { PhysioFunctionalScalesService } from './physio-functional-scales.service';
import { PhysioFunctionalScalesController } from './physio-functional-scales.controller';
import { PhysioPackagesService } from './physio-packages.service';
import { PhysioPackagesController } from './physio-packages.controller';
import { PhysioDischargesService } from './physio-discharges.service';
import { PhysioDischargesController } from './physio-discharges.controller';
import { DatabaseModule } from '../../infra/database/database.module';
import { ClientAccessModule } from '../../common/client-access/client-access.module';

@Module({
  imports: [DatabaseModule, ClientAccessModule],
  controllers: [
    RehabPlansController,
    PhysioSessionEvolutionsController,
    PhysioFunctionalScalesController,
    PhysioPackagesController,
    PhysioDischargesController,
  ],
  providers: [
    RehabPlansService,
    PhysioReadService,
    PhysioSessionEvolutionsService,
    PhysioFunctionalScalesService,
    PhysioPackagesService,
    PhysioDischargesService,
  ],
})
export class RehabPlansModule {}
