import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateWorkoutDto {
  @IsString()
  @IsNotEmpty({ message: 'O tipo de atividade é obrigatório (ex: Musculação)' })
  activityType: string;

  @IsInt()
  @Min(1, { message: 'A duração deve ser de pelo menos 1 minuto' })
  durationMinutes: number;

  @IsString()
  @IsNotEmpty({ message: 'A intensidade é obrigatória (ex: INTENSO)' })
  intensity: string;

  @IsNumber()
  @IsOptional()
  sleepHours?: number;

  @IsInt()
  @Min(1)
  @Max(5, { message: 'O humor deve ser uma nota de 1 a 5' })
  @IsOptional()
  moodLevel?: number; 
}