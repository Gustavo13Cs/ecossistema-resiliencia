export const PERSONAL_P1_SPECS = [
  'cypress/e2e/personal-workspace-real.cy.ts',
  'cypress/e2e/professional-phase1-real.cy.ts',
  'cypress/e2e/assessments-client-real.cy.ts',
  'cypress/e2e/client-owned-clinical-resources.cy.ts',
] as const;

export function personalRealSpecs(args: readonly string[]): string {
  if (!args.length) return PERSONAL_P1_SPECS.join(',');
  if (args.length !== 2 || args[0] !== '--spec' || !args[1].trim()) {
    throw new Error(
      'Usage: run-personal-p1-real.ts [--spec <comma-separated list>]',
    );
  }
  return args[1];
}

export function packageCommand(
  tool: 'npm' | 'npx',
  args: readonly string[],
  platform: NodeJS.Platform,
): { command: string; args: string[] } {
  if (platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `${tool}.cmd`, ...args],
    };
  }
  return { command: tool, args: [...args] };
}
