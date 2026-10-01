import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

describe('Strict API type contracts', () => {
  it('requires strict compilation and rejects implicit any/bind/fallthrough', () => {
    const config = JSON.parse(
      readFileSync(resolve(__dirname, '../tsconfig.json'), 'utf8'),
    ) as { compilerOptions: Record<string, unknown> };
    expect(config.compilerOptions).toMatchObject({
      strict: true,
      noImplicitAny: true,
      strictBindCallApply: true,
      noFallthroughCasesInSwitch: true,
    });
  });
  it('has no Prisma catch-all or explicit any in application code', () => {
    const unsafe: string[] = [];
    function visitDirectory(path: string) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const file = resolve(path, entry.name);
        if (entry.isDirectory()) visitDirectory(file);
        else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.spec.ts')
        ) {
          const source = ts.createSourceFile(
            file,
            readFileSync(file, 'utf8'),
            ts.ScriptTarget.Latest,
            true,
          );
          const visit = (node: ts.Node) => {
            if (
              node.kind === ts.SyntaxKind.AnyKeyword ||
              (entry.name === 'prisma.service.ts' &&
                ts.isIndexSignatureDeclaration(node))
            )
              unsafe.push(file);
            ts.forEachChild(node, visit);
          };
          visit(source);
        }
      }
    }
    visitDirectory(__dirname);
    expect(unsafe).toEqual([]);
  });
});
