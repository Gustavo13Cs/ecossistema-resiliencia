import { AppointmentsController } from './appointments.controller';

describe('AppointmentsController', () => {
  const professional = {
    sub: 'professional-1',
    role: 'PHYSIO',
  } as const;
  const request = { user: professional };
  const service = {
    create: jest.fn(),
    list: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
    complete: jest.fn(),
    markNoShow: jest.fn(),
    cancel: jest.fn(),
  };
  let controller: AppointmentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AppointmentsController(service as never);
  });

  it('forwards creation with the authenticated professional', async () => {
    const dto = {
      clientId: 'efc4a745-d7c7-4a64-a85d-c65f2f158c67',
      kind: 'FIRST_VISIT',
      modality: 'IN_PERSON',
      startsAt: '2026-09-15T13:00:00.000Z',
      endsAt: '2026-09-15T14:00:00.000Z',
      timeZone: 'America/Sao_Paulo',
    } as const;
    service.create.mockResolvedValue({ id: 'appointment-1' });

    await expect(controller.create(request, dto)).resolves.toEqual({
      id: 'appointment-1',
    });
    expect(service.create).toHaveBeenCalledWith(professional, dto);
  });

  it('forwards every lifecycle command with the owned identifier', async () => {
    const id = '251aef6e-1acf-4adc-a188-d79811f78e38';
    const action = { expectedUpdatedAt: '2026-09-14T12:00:00.000Z' };
    const cancel = { ...action, reason: 'Cliente solicitou cancelamento' };
    service.confirm.mockResolvedValue({ id, status: 'CONFIRMED' });
    service.complete.mockResolvedValue({ id, status: 'COMPLETED' });
    service.markNoShow.mockResolvedValue({ id, status: 'NO_SHOW' });
    service.cancel.mockResolvedValue({ id, status: 'CANCELLED' });

    await controller.confirm(request, id, action);
    await controller.complete(request, id, action);
    await controller.markNoShow(request, id, action);
    await controller.cancel(request, id, cancel);

    expect(service.confirm).toHaveBeenCalledWith(professional, id, action);
    expect(service.complete).toHaveBeenCalledWith(professional, id, action);
    expect(service.markNoShow).toHaveBeenCalledWith(professional, id, action);
    expect(service.cancel).toHaveBeenCalledWith(professional, id, cancel);
  });
});
