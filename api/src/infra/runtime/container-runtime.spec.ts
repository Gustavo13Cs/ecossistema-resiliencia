import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../..');
describe('Production container boundaries', () => {
  it('installs only API runtime dependencies and keeps migrations in a separate target', () => {
    const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
    const runtime = dockerfile.split(/FROM[^\n]+AS production\s*/i)[1];
    expect(dockerfile).toMatch(/npm ci --omit=dev --omit=optional/);
    expect(dockerfile).toMatch(/FROM builder AS migration/);
    expect(dockerfile).toContain('"migrate", "deploy"');
    expect(runtime).not.toMatch(
      /COPY[^\n]+--from=builder[^\n]+\/node_modules\s+\.\/node_modules/,
    );
    expect(runtime).toMatch(
      /COPY[^\n]+--from=runtime-dependencies[^\n]+node_modules/,
    );
    expect(runtime).toContain('node_modules/.prisma');
    expect(runtime).toContain('CMD ["node", "dist/src/main.js"]');
    expect(runtime).not.toContain('migrate deploy');
  });

  it('runs the traced Next standalone server with static and public assets', () => {
    const dockerfile = readFileSync(resolve(root, 'web/Dockerfile'), 'utf8');
    const runtime = dockerfile.split(/FROM[^\n]+AS production\s*/i)[1];
    expect(runtime).toContain('/.next/standalone ./');
    expect(runtime).toContain('/.next/static ./.next/static');
    expect(runtime).toContain('/public ./public');
    expect(runtime).toContain('CMD ["node", "server.js"]');
    expect(runtime).not.toContain('/node_modules ./node_modules');
    expect(
      readFileSync(resolve(root, 'web/next.config.mjs'), 'utf8'),
    ).toContain('output: "standalone"');
  });

  it('excludes environment secrets from both Docker build contexts', () => {
    for (const path of ['.dockerignore', 'web/.dockerignore']) {
      const patterns = readFileSync(resolve(root, path), 'utf8').split(/\r?\n/);
      expect(patterns).toContain('**/.env');
      expect(patterns).toContain('**/.env.*');
    }
  });
});
