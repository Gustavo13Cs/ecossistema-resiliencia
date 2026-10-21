import {
  packageCommand,
  personalRealSpecs,
  PERSONAL_P1_SPECS,
} from './personal-real-runner-options';

describe('Personal real runner options', () => {
  it('preserves all four P1 regression specs by default', () => {
    expect(personalRealSpecs([]).split(',')).toEqual([
      'cypress/e2e/personal-workspace-real.cy.ts',
      'cypress/e2e/professional-phase1-real.cy.ts',
      'cypress/e2e/assessments-client-real.cy.ts',
      'cypress/e2e/client-owned-clinical-resources.cy.ts',
    ]);
    expect(PERSONAL_P1_SPECS).toHaveLength(4);
  });

  it('accepts an explicit comma separated list without changing the defaults', () => {
    const specs = 'cypress/e2e/personal-workout-drafts-real.cy.ts,a.cy.ts';
    expect(personalRealSpecs(['--spec', specs])).toBe(specs);
    expect(personalRealSpecs([])).toBe(PERSONAL_P1_SPECS.join(','));
  });

  it('enables the isolated media harness without changing spec defaults', () => {
    expect(personalRealSpecs(['--media-fixture'])).toBe(
      PERSONAL_P1_SPECS.join(','),
    );
    expect(
      personalRealSpecs(['--spec', 'visual.cy.ts', '--media-fixture']),
    ).toBe('visual.cy.ts');
  });

  it('allows explicit artifact reuse while preserving default full builds/specs', () => {
    expect(
      personalRealSpecs([
        '--reuse-build',
        '--spec',
        'visual.cy.ts',
        '--media-fixture',
      ]),
    ).toBe('visual.cy.ts');
  });

  it.each([['--spec'], ['--spec', ''], ['--other'], ['--spec', 'a', 'b']])(
    'rejects malformed arguments %j',
    (...args) => expect(() => personalRealSpecs(args)).toThrow('--spec'),
  );

  it.each(['npm', 'npx'] as const)(
    'spawns %s directly on Linux without cmd.exe',
    (tool) => {
      expect(packageCommand(tool, ['run', 'build'], 'linux')).toEqual({
        command: tool,
        args: ['run', 'build'],
      });
    },
  );

  it.each(['npm', 'npx'] as const)(
    'spawns %s.cmd through the Windows command interpreter on win32',
    (tool) => {
      expect(packageCommand(tool, ['run', 'build'], 'win32')).toEqual({
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', `${tool}.cmd`, 'run', 'build'],
      });
    },
  );
});
