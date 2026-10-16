import {
  IsDateString,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateAssessmentDto {
  @ValidateIf((dto: CreateAssessmentDto) => !dto.userId)
  @IsString()
  clientId?: string;

  // Compatibilidade temporária com avaliações vinculadas ao antigo User.
  @ValidateIf((dto: CreateAssessmentDto) => !dto.clientId)
  @IsString()
  userId?: string;
  @IsOptional() @IsDateString() date?: string;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  weight?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  bodyFat?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  muscleMass?: number;

  // Circunferências
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  waist?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  abdomen?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  hips?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  thorax?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  armLeft?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  armRight?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  thighLeft?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  thighRight?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  calfLeft?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  calfRight?: number;

  // Dobras
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldTriceps?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldSubscapular?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldChest?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldAxillary?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldSuprailiac?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldAbdominal?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  skinfoldThigh?: number;

  // Performance
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  benchPress1RM?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  squat1RM?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  deadlift1RM?: number;
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  vo2Max?: number;

  @IsOptional() @IsString() notes?: string;
}
