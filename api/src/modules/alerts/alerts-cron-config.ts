/** Desativa o agendador somente na instância mantida como reserva regional. */
export function alertsCronDisabled(
  value: string | undefined = process.env.DISABLE_SCHEDULED_ALERTS,
): boolean {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('DISABLE_SCHEDULED_ALERTS deve ser true ou false.');
}
