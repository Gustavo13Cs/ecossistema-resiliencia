import { Type } from 'class-transformer';
import { ClientGoalCategory, ClientGoalStatus } from '@prisma/client';
import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class HabitTargetsDto {
  @IsInt() @Min(1) @Max(20000) waterTargetMl!: number;
  @IsNumber() @Min(1) @Max(24) sleepTargetHours!: number;
  @IsInt() @Min(0) @Max(100) mealsAdherencePercent!: number;
  @IsInt() @Min(0) @Max(100000) dailyStepsTarget!: number;
  @IsOptional() @IsString() @MaxLength(10000) habitsNotes?: string;
}

export class UpsertClientGoalDto {
  @IsEnum(ClientGoalCategory) category!: ClientGoalCategory;
  @IsOptional() @IsEnum(ClientGoalStatus) status?: ClientGoalStatus;
  @IsDateString() startDate!: string;
  @IsDateString() targetDate!: string;
  @IsOptional() @IsNumber() @Min(1) @Max(1000) targetWeightKg?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100) targetBodyFatPercent?:
    | number
    | null;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) targetMuscleMassKg?:
    | number
    | null;
  @IsOptional() @IsNumber() @Min(1) @Max(1000) startWeightKg?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100) startBodyFatPercent?:
    | number
    | null;
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => HabitTargetsDto)
  habits!: HabitTargetsDto;
  @IsOptional() @IsString() @MaxLength(20000) clinicalNotes?: string;
}
