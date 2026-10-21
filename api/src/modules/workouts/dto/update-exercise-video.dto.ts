import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateExerciseVideoDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedMediaVersion!: number;

  // null remove o link; undefined continua inválido.
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(2048)
  videoUrl!: string | null;
}
