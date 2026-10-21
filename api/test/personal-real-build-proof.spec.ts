import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertBuildProof,
  recordBuildProof,
} from './personal-real-build-proof';

describe('real runner artifact reuse', () => {
  it('rejects source/config or build changes while permitting test-only edits', () => {
    const root = mkdtempSync(join(tmpdir(), 'personal-build-proof-'));
    const write = (file: string, value: string) =>
      writeFileSync(join(root, file), value);
    try {
      for (const path of [
        'api/src',
        'api/dist/src',
        'web/.next',
        'web/app',
        'web/cypress',
      ])
        mkdirSync(join(root, path), { recursive: true });
      write('api/dist/src/main.js', 'built-api');
      write('web/.next/BUILD_ID', 'built-web');
      write('web/app/page.tsx', 'approved-page');
      recordBuildProof(root);
      write('web/cypress/flow.cy.ts', 'updated-harness');
      expect(() => assertBuildProof(root)).not.toThrow();
      write('web/app/page.tsx', 'changed-page');
      expect(() => assertBuildProof(root)).toThrow('sources/config');
      write('web/app/page.tsx', 'approved-page');
      write('web/next.config.mjs', 'changed-config');
      expect(() => assertBuildProof(root)).toThrow('sources/config');
      rmSync(join(root, 'web/next.config.mjs'));
      write('web/.next/BUILD_ID', 'different-build');
      expect(() => assertBuildProof(root)).toThrow('build ID');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
