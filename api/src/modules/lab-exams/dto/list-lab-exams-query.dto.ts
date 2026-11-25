import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../common/pagination/page-query.dto';
export class ListLabExamsQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsString() @MaxLength(2000) q?: string;
  @IsOptional()
  @IsIn(['ALL', 'OPTIMAL', 'BORDERLINE', 'ALERT'])
  status?: string;
  @IsOptional()
  @IsIn([
    'ALL',
    'GLYCEMIC',
    'LIPID',
    'THYROID',
    'HEMATOLOGY',
    'VITAMINS_MINERALS',
    'HEPATIC_RENAL',
    'INFLAMMATORY',
    'HORMONAL',
    'OUTROS',
  ])
  category?: string;
}
export class LabLongitudinalQueryDto extends PageQueryDto {
  @IsString() @MaxLength(200) markerName!: string;
  @IsOptional() @IsUUID() clientId?: string;
}
