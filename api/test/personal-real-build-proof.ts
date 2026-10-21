import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const sourceRoots = [
  'api/src',
  'api/scripts',
  'api/prisma',
  'web/app',
  'web/components',
  'web/contexts',
  'web/hooks',
  'web/lib',
  'web/types',
  'web/styles',
  'web/public',
  'web/scripts',
];
const configuration = [
  'api/package.json',
  'api/package-lock.json',
  'api/tsconfig.json',
  'api/tsconfig.build.json',
  'api/nest-cli.json',
  'api/prisma.config.ts',
  'web/package.json',
  'web/package-lock.json',
  'web/tsconfig.json',
  'web/next.config.mjs',
  'web/postcss.config.mjs',
  'web/proxy.ts',
];

export function applicationSourceDigest(root: string): string {
  const files: string[] = [];
  const collect = (path: string) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name === '__tests__' || /\.(test|spec)\./.test(entry.name))
        continue;
      const child = join(path, entry.name);
      if (entry.isDirectory()) collect(child);
      else if (entry.isFile()) files.push(child);
    }
  };
  for (const path of sourceRoots) collect(resolve(root, path));
  for (const path of configuration) {
    const file = resolve(root, path);
    if (existsSync(file)) files.push(file);
  }
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    hash.update(relative(root, file));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function recordBuildProof(root: string): void {
  // Called only after both real builds, including Next postbuild, return zero.
  readFileSync(resolve(root, 'api/dist/src/main.js'));
  const buildId = readFileSync(resolve(root, 'web/.next/BUILD_ID'), 'utf8');
  writeFileSync(
    resolve(root, 'api/dist/personal-real-build-proof.json'),
    JSON.stringify({
      sourceDigest: applicationSourceDigest(root),
      buildId,
    }),
  );
}

export function assertBuildProof(root: string): void {
  const proof = JSON.parse(
    readFileSync(
      resolve(root, 'api/dist/personal-real-build-proof.json'),
      'utf8',
    ),
  ) as { sourceDigest: string; buildId: string };
  readFileSync(resolve(root, 'api/dist/src/main.js'));
  if (
    proof.sourceDigest !== applicationSourceDigest(root) ||
    proof.buildId !== readFileSync(resolve(root, 'web/.next/BUILD_ID'), 'utf8')
  ) {
    throw new Error(
      'Application sources/config or build ID changed; run full builds before reuse',
    );
  }
}
