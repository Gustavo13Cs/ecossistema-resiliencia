import { Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// Compatibilidade interna: toda autenticação usa a estratégia com sessão revogável.
@Injectable()
export class AuthGuard extends JwtAuthGuard {}
