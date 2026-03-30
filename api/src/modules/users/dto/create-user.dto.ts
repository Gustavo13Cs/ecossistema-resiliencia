import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password: string;

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
}