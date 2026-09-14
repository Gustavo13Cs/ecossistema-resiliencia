import { Prisma } from '@prisma/client';

describe('appointments Prisma contract', () => {
  it('exposes the professional appointment models', () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

    expect(modelNames).toEqual(
      expect.arrayContaining(['Appointment', 'AppointmentEvent']),
    );
  });
});
