import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  const tx = {
    client: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    clientAuditEvent: { create: jest.fn() },
  };
  const prisma = {
    client: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const access = { getOwnedClient: jest.fn() };
  let service: ClientsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    service = new ClientsService(
      prisma as never,
      access as unknown as ClientAccessService,
    );
  });

  it('derives ownership, maps creation fields and writes CREATED audit event', async () => {
    tx.client.create.mockResolvedValue({
      id: 'client-1',
      professionalId: 'pro-1',
    });

    await service.create(
      { sub: 'pro-1', role: 'NUTRITIONIST' },
      { name: 'Ana', email: 'ana@example.com' } as CreateClientDto,
    );

    expect(tx.client.create).toHaveBeenCalledWith({
      data: {
        professionalId: 'pro-1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: null,
        birthDate: null,
        gender: null,
        goal: null,
        height: null,
        initialWeight: null,
        allergies: null,
        pathologies: null,
        typicalSleep: null,
        stressLevel: null,
        foodRelationship: null,
        psychologyHistory: null,
        exerciseType: null,
        exerciseFrequency: null,
        exerciseDuration: null,
        hasPersonal: null,
        workActivityLevel: null,
        professionalNotes: null,
        privacyNotes: null,
      },
    });
    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'CREATED' },
    });
  });

  it('lists only the authenticated professional active clients', async () => {
    prisma.client.findMany.mockResolvedValue([]);

    await service.findAll({ sub: 'pro-2', role: 'PERSONAL' }, 'ACTIVE');

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { professionalId: 'pro-2', status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
  });

  it('delegates findOne to the ownership service', async () => {
    const client = { id: 'client-1', professionalId: 'pro-1' };
    access.getOwnedClient.mockResolvedValue(client);

    await expect(
      service.findOne({ sub: 'pro-1', role: 'NUTRITIONIST' }, 'client-1'),
    ).resolves.toEqual(client);

    expect(access.getOwnedClient).toHaveBeenCalledWith(
      { sub: 'pro-1', role: 'NUTRITIONIST' },
      'client-1',
    );
  });

  it('archives an owned client and writes ARCHIVED audit event', async () => {
    const user = { sub: 'pro-1', role: 'PHYSIO' } as const;
    access.getOwnedClient.mockResolvedValue({
      id: 'client-1',
      professionalId: 'pro-1',
    });
    tx.client.update.mockResolvedValue({ id: 'client-1', status: 'ARCHIVED' });

    await service.setStatus(user, 'client-1', 'ARCHIVED');

    expect(access.getOwnedClient).toHaveBeenCalledWith(user, 'client-1');
    expect(tx.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: { status: 'ARCHIVED' },
    });
    expect(access.getOwnedClient.mock.invocationCallOrder[0]).toBeLessThan(
      tx.client.update.mock.invocationCallOrder[0],
    );
    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'ARCHIVED' },
    });
  });

  it('does not write or audit a status change when ownership fails', async () => {
    access.getOwnedClient.mockRejectedValue(
      new ForbiddenException('Cliente não pertence ao profissional'),
    );

    await expect(
      service.setStatus(
        { sub: 'pro-2', role: 'PHYSIO' },
        'client-1',
        'ARCHIVED',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.client.update).not.toHaveBeenCalled();
    expect(tx.clientAuditEvent.create).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate email inside the same professional account', async () => {
    tx.client.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate client email', {
        code: 'P2002',
        clientVersion: '7.5.0',
        meta: { target: ['professionalId', 'email'] },
      }),
    );

    await expect(
      service.create(
        { sub: 'pro-1', role: 'NUTRITIONIST' },
        { name: 'Ana', email: 'ana@example.test' } as CreateClientDto,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps every mutable client field and audits an owned update', async () => {
    const user = { sub: 'pro-1', role: 'NUTRITIONIST' } as const;
    access.getOwnedClient.mockResolvedValue({
      id: 'client-1',
      professionalId: 'pro-1',
    });
    tx.client.update.mockResolvedValue({ id: 'client-1', name: 'Ana Maria' });

    await service.update(user, 'client-1', {
      name: ' Ana Maria ',
      email: ' UPDATE@EXAMPLE.COM ',
      phone: ' 11999999999 ',
      birthDate: '1990-01-02',
      gender: ' Feminino ',
      goal: ' Saúde ',
      height: 1.7,
      initialWeight: null,
      allergies: ' Nenhuma ',
      pathologies: null,
      typicalSleep: ' 8 horas ',
      stressLevel: 3,
      foodRelationship: null,
      psychologyHistory: ' Acompanhamento ',
      exerciseType: ' Musculação ',
      exerciseFrequency: null,
      exerciseDuration: ' 45 min ',
      hasPersonal: ' Sim ',
      workActivityLevel: null,
      professionalNotes: ' Nota clínica ',
      privacyNotes: null,
    } as UpdateClientDto);

    expect(access.getOwnedClient).toHaveBeenCalledWith(user, 'client-1');
    expect(tx.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: {
        name: 'Ana Maria',
        email: 'update@example.com',
        phone: '11999999999',
        birthDate: new Date('1990-01-02'),
        gender: 'Feminino',
        goal: 'Saúde',
        height: 1.7,
        initialWeight: null,
        allergies: 'Nenhuma',
        pathologies: null,
        typicalSleep: '8 horas',
        stressLevel: 3,
        foodRelationship: null,
        psychologyHistory: 'Acompanhamento',
        exerciseType: 'Musculação',
        exerciseFrequency: null,
        exerciseDuration: '45 min',
        hasPersonal: 'Sim',
        workActivityLevel: null,
        professionalNotes: 'Nota clínica',
        privacyNotes: null,
      },
    });
    expect(access.getOwnedClient.mock.invocationCallOrder[0]).toBeLessThan(
      tx.client.update.mock.invocationCallOrder[0],
    );
    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'UPDATED' },
    });
  });

  it('restores an owned client and writes RESTORED audit event', async () => {
    access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
    tx.client.update.mockResolvedValue({ id: 'client-1', status: 'ACTIVE' });

    await service.setStatus(
      { sub: 'pro-1', role: 'PHYSIO' },
      'client-1',
      'ACTIVE',
    );

    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'RESTORED' },
    });
  });
});

describe('Client DTO validation', () => {
  it('normalizes optional text before validating email and preserves null cleanup', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: ' Ana ',
      email: ' ANA@EXAMPLE.COM ',
      phone: '   ',
      hasPersonal: ' Sim ',
    });
    const nullableEmail = plainToInstance(CreateClientDto, {
      name: 'Ana',
      email: null,
    });
    const blankEmail = plainToInstance(CreateClientDto, {
      name: 'Ana',
      email: '   ',
    });

    expect(dto).toMatchObject({
      name: 'Ana',
      email: 'ana@example.com',
      phone: null,
      hasPersonal: 'Sim',
    });
    expect(nullableEmail.email).toBeNull();
    expect(blankEmail.email).toBeNull();
    await expect(validate(dto)).resolves.toHaveLength(0);
    await expect(validate(nullableEmail)).resolves.toHaveLength(0);
    await expect(validate(blankEmail)).resolves.toHaveLength(0);
  });

  it('rejects a creation name that contains only whitespace', async () => {
    const dto = plainToInstance(CreateClientDto, { name: '   ' });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'name' })]),
    );
  });

  it('skips an omitted update name but rejects null and whitespace names', async () => {
    const omitted = plainToInstance(UpdateClientDto, {});
    const nullable = plainToInstance(UpdateClientDto, { name: null });
    const blank = plainToInstance(UpdateClientDto, { name: '   ' });

    await expect(validate(omitted)).resolves.toHaveLength(0);
    await expect(validate(nullable)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'name' })]),
    );
    await expect(validate(blank)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'name' })]),
    );
  });
});
