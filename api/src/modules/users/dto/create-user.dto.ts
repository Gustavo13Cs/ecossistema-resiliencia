import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsNumber, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name!: string; 

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string; 

  @IsString()
  @MinLength(6)
  password!: string; 

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  department?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString() 
  birthDate?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  initialWeight?: number;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  pathologies?: string;

  @IsOptional() @IsString()
  typicalSleep?: string;

  @IsOptional() @IsNumber()
  stressLevel?: number;

  @IsOptional() @IsString()
  foodRelationship?: string;

  @IsOptional() @IsString()
  psychologyHistory?: string;

  @IsOptional() @IsString()
  exerciseType?: string;

  @IsOptional() @IsString()
  exerciseFrequency?: string;

  @IsOptional() @IsString()
  exerciseDuration?: string;

  @IsOptional() @IsString()
  hasPersonal?: string;

  @IsOptional() @IsString()
  workActivityLevel?: string;

  @IsOptional() @IsString()
  nutritionistNotes?: string;
}