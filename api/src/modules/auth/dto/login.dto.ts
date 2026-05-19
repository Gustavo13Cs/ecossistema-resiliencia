import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  email: string | undefined;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password!: string;
}