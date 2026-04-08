import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsInt } from 'class-validator';

export class CreateWorkoutDto {
  @IsString()
  activityType!: string; 

  @IsInt()
  @Min(1, { message: 'A duração deve ser de pelo menos 1 minuto' })
  durationMinutes!: number; 

  @IsString()
  @IsNotEmpty({ message: 'A intensidade é obrigatória (ex: INTENSO)' })
  intensity!: string; 

  @IsOptional()
  @IsNumber()
  sleepHours?: number;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5, { message: 'O humor deve ser uma nota de 1 a 5' })
  moodLevel?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}