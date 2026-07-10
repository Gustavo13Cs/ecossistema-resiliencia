import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(8, { message: 'Senha precisa ter no mínimo 8 caracteres' })
  password!: string;
}