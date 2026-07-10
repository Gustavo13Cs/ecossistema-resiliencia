import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../infra/database/database.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
          throw new Error(
            '[AuthModule] JWT_SECRET não está configurado. A aplicação não pode subir sem ele.',
          );
        }

        return {
          global: true,
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // ← JwtStrategy registrada aqui
})
export class AuthModule {}