import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  WEB_VITAL_DEVICES,
  WEB_VITAL_METRICS,
  WEB_VITAL_NAVIGATION_TYPES,
  WEB_VITAL_RATINGS,
  type WebVitalDeviceCategory,
  type WebVitalMetricName,
  type WebVitalNavigationType,
  type WebVitalRating,
} from '../web-vitals-routes';

@ValidatorConstraint({ name: 'webVitalValueBounds', async: false })
class WebVitalValueBoundsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return false;
    }
    const item = args.object as Partial<ReportWebVitalItemDto>;
    if (item.name === 'CLS') {
      return value <= 100;
    }
    return value <= 60_000;
  }

  defaultMessage(): string {
    return 'value exceeds maximum allowed Web Vital bound';
  }
}

export class ReportWebVitalItemDto {
  @IsIn(WEB_VITAL_METRICS)
  name!: WebVitalMetricName;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(60_000)
  @Validate(WebVitalValueBoundsConstraint)
  value!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(60_000)
  delta?: number;

  @IsString()
  @MaxLength(200)
  route!: string;

  @IsIn(WEB_VITAL_DEVICES)
  device!: WebVitalDeviceCategory;

  @IsOptional()
  @IsIn(WEB_VITAL_RATINGS)
  rating?: WebVitalRating;

  @IsOptional()
  @IsIn(WEB_VITAL_NAVIGATION_TYPES)
  navigationType?: WebVitalNavigationType;
}

export class ReportWebVitalsBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ReportWebVitalItemDto)
  metrics!: ReportWebVitalItemDto[];
}

export class WebVitalsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  route?: string;

  @IsOptional()
  @IsIn(WEB_VITAL_DEVICES)
  device?: WebVitalDeviceCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  top?: number;
}
