import { alertsCronDisabled } from './alerts-cron-config';

describe('Regional standby alert scheduler', () => {
  it('preserves scheduling by default and with false', () => {
    const before = process.env.DISABLE_SCHEDULED_ALERTS;
    delete process.env.DISABLE_SCHEDULED_ALERTS;
    try {
      expect(alertsCronDisabled()).toBe(false);
      expect(alertsCronDisabled('false')).toBe(false);
    } finally {
      if (before !== undefined) process.env.DISABLE_SCHEDULED_ALERTS = before;
    }
  });
  it('disables only the explicitly selected standby', () => {
    expect(alertsCronDisabled('true')).toBe(true);
  });
  it.each(['', 'TRUE', '0'])(
    'refuses ambiguous scheduler configuration %j',
    (value) => {
      expect(() => alertsCronDisabled(value)).toThrow(
        'DISABLE_SCHEDULED_ALERTS',
      );
    },
  );
});
