import { PrismaService } from '../src/infra/database/prisma.service';

type AppointmentTables = {
  appointments: string | null;
  appointment_events: string | null;
};

describe('professional appointments migration', () => {
  const prisma = new PrismaService();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates both appointment tables through versioned migrations', async () => {
    const [tables] = await prisma.$queryRaw<AppointmentTables[]>`
      SELECT
        to_regclass('public.appointments')::text AS appointments,
        to_regclass('public.appointment_events')::text AS appointment_events
    `;

    expect(tables).toEqual({
      appointments: 'appointments',
      appointment_events: 'appointment_events',
    });
  });
});
