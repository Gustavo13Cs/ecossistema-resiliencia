import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppointmentActionDto } from './dto/appointment-action.dto';
import { AppointmentRangeQueryDto } from './dto/appointment-range-query.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

describe('appointment DTO validation', () => {
  const validCreate = {
    clientId: 'efc4a745-d7c7-4a64-a85d-c65f2f158c67',
    kind: 'FIRST_VISIT',
    modality: 'ONLINE',
    startsAt: '2026-09-15T13:00:00.000Z',
    endsAt: '2026-09-15T14:00:00.000Z',
    timeZone: 'America/Sao_Paulo',
    meetingUrl: 'https://meet.example.com/consulta',
    notes: 'Revisar evolução',
  };

  it('accepts a complete professional appointment command', async () => {
    await expect(
      validate(plainToInstance(CreateAppointmentDto, validCreate)),
    ).resolves.toHaveLength(0);
  });

  it.each([
    ['clientId', { ...validCreate, clientId: 'client-1' }],
    ['kind', { ...validCreate, kind: 'INVALID' }],
    ['modality', { ...validCreate, modality: 'PHONE' }],
    ['startsAt', { ...validCreate, startsAt: '2026-09-15T13:00:00' }],
    ['endsAt', { ...validCreate, endsAt: 'tomorrow' }],
    ['timeZone', { ...validCreate, timeZone: 'Invalid/Zone' }],
    ['meetingUrl', { ...validCreate, meetingUrl: 'http://insecure.test' }],
    ['notes', { ...validCreate, notes: 'x'.repeat(1_001) }],
  ])('rejects an invalid %s', async (property, value) => {
    const errors = await validate(plainToInstance(CreateAppointmentDto, value));

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property })]),
    );
  });

  it('requires the optimistic snapshot on updates and actions', async () => {
    const updateErrors = await validate(
      plainToInstance(UpdateAppointmentDto, { notes: 'Novo texto' }),
    );
    const actionErrors = await validate(
      plainToInstance(AppointmentActionDto, {}),
    );

    expect(updateErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'expectedUpdatedAt' }),
      ]),
    );
    expect(actionErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'expectedUpdatedAt' }),
      ]),
    );
  });

  it('validates range length, filters and explicit UTC offsets', async () => {
    const range = plainToInstance(AppointmentRangeQueryDto, {
      from: '2026-09-01T00:00:00',
      to: '2026-10-14T00:00:00.000Z',
      clientId: 'not-a-uuid',
      status: 'UNKNOWN',
    });
    const errors = await validate(range);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['from', 'to', 'clientId', 'status']),
    );
  });

  it('trims and validates the cancellation reason', async () => {
    const invalid = plainToInstance(CancelAppointmentDto, {
      expectedUpdatedAt: '2026-09-14T12:00:00.000Z',
      reason: ' x ',
    });
    const errors = await validate(invalid);

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'reason' })]),
    );
  });
});
