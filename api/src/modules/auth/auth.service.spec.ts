import { AuthSessionService } from './auth-session.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infra/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  type MockUser = {
    id: string;
    name?: string;
    email?: string;
    password?: string;
    role: string;
  };
  const prisma = {
    user: {
      findUnique: jest.fn<Promise<MockUser | null>, [unknown]>(),
      create: jest.fn<Promise<MockUser>, [unknown]>(),
    },
  };
  const sessions = { create: jest.fn() };
  let service: AuthService;
  let capturedUserCreateArgs: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    capturedUserCreateArgs = undefined;
    prisma.user.create.mockImplementation((args) => {
      capturedUserCreateArgs = args;
      return Promise.resolve({ id: 'pro-1', role: 'PHYSIO' });
    });
    service = new AuthService(
      prisma as unknown as PrismaService,
      sessions as unknown as AuthSessionService,
    );
  });

  it('persists the requested professional role without a patient fallback', async () => {
    await service.register({
      name: 'Fisioterapeuta',
      email: 'physio@example.test',
      password: '12345678',
      role: 'PHYSIO',
    } as unknown as RegisterDto);

    const createCall = capturedUserCreateArgs as {
      data: { role?: string };
      select: object;
    };
    expect(createCall.data.role).toBe('PHYSIO');
    expect(createCall.select).toBeDefined();
  });

  it('normalizes the professional email before checking and persisting it', async () => {
    await service.register({
      name: 'Fisioterapeuta',
      email: '  PHYSIO@Example.Test  ',
      password: '12345678',
      role: 'PHYSIO',
    } as RegisterDto);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'physio@example.test' },
    });
    const createCall = capturedUserCreateArgs as {
      data: { email: string };
      select: object;
    };
    expect(createCall.data.email).toBe('physio@example.test');
    expect(createCall.select).toBeDefined();
  });

  it('normalizes the email before looking up a login', async () => {
    const password = await bcrypt.hash('12345678', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'pro-1',
      name: 'Fisioterapeuta',
      email: 'physio@example.test',
      password,
      role: 'PHYSIO',
    });
    sessions.create.mockResolvedValue({ access_token: 'signed-token' });

    await service.login({
      email: '  PHYSIO@Example.Test  ',
      password: '12345678',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'physio@example.test' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        authVersion: true,
      },
    });
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pro-1' }),
    );
  });

  it('does not replace a missing role with PATIENT', async () => {
    await service.register({
      name: 'Profissional',
      email: 'pro@example.test',
      password: '12345678',
    } as RegisterDto);

    const createCall = capturedUserCreateArgs as {
      data: { role?: string };
      select: object;
    };
    expect(createCall.data.role).toBeUndefined();
    expect(createCall.select).toBeDefined();
  });
});
