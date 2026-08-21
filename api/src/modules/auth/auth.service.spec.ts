import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infra/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwtService = { signAsync: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'pro-1', role: 'PHYSIO' });
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  it('persists the requested professional role without a patient fallback', async () => {
    await service.register({
      name: 'Fisioterapeuta',
      email: 'physio@example.test',
      password: '12345678',
      role: 'PHYSIO',
    } as unknown as RegisterDto);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'PHYSIO' }),
      select: expect.any(Object),
    });
  });

  it('does not replace a missing role with PATIENT', async () => {
    await service.register({
      name: 'Profissional',
      email: 'pro@example.test',
      password: '12345678',
    } as RegisterDto);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: undefined }),
      select: expect.any(Object),
    });
  });
});
