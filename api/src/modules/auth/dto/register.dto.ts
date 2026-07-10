import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum RegisterRole {
  PATIENT = 'PATIENT',
  PERSONAL = 'PERSONAL',      
  NUTRITIONIST = 'NUTRITIONIST', 
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Senha precisa ter no mínimo 8 caracteres' })
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsEnum(RegisterRole, { message: 'Role inválida' })
  @IsOptional()
  role?: RegisterRole;
}