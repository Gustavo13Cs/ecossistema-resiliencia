# Tarefa 1 — Gates frontend e política tipada de workspace

## Status

Concluída. O frontend agora tem gates de lint, typecheck, unit test e e2e configurados, além de uma política única e tipada para os três workspaces profissionais.

## Implementação e arquivos

- `web/package.json` e `web/package-lock.json`: instalaram as dependências de qualidade definidas no brief com `npm.cmd install --save-dev --legacy-peer-deps` e expõem os scripts `lint`, `typecheck`, `test`, `test:watch`, `test:coverage` e `e2e`.
- `web/eslint.config.mjs`: usa o flat config `eslint-config-next/core-web-vitals`, mantém `--max-warnings=0` e ignora apenas artefatos de build. A base legada tinha 33 erros e 2 warnings incompatíveis com cinco regras React 19; os overrides globais desativam somente essas regras. Os arquivos novos da fundação (`types`, política e testes) voltam as cinco regras a `error`.
- `web/vitest.config.mts` e `web/test/setup.ts`: configuram Vitest em `jsdom`, React plugin, alias do `tsconfig.json` e os matchers do Testing Library.
- `web/types/auth.ts`: define `ProfessionalRole`, `UserRole` e `AuthUser`.
- `web/lib/professional-workspace.ts`: concentra a matriz imutável de navegação, metadados dos workspaces e autorização de caminhos. O `ADMIN` somente acessa `/home`; os caminhos clínicos cruzados, `/clientes/:id/visao-360` e caminhos não classificados são negados.
- `web/lib/professional-workspace.test.ts`: verifica isolamento de navegação para Nutrição, Personal e Fisioterapia, e bloqueio direto entre domínios/para ADMIN.
- `web/contexts/auth-context.tsx`: substitui apenas o tipo local por `AuthUser`; nenhum fluxo de sessão foi modificado.

## Evidência TDD

1. **Red**: com o teste de política criado e sem `professional-workspace.ts`, `npm.cmd test -- professional-workspace.test.ts` falhou com `Failed to resolve import "./professional-workspace" ... Does the file exist?` (exit 1). A falha era a ausência esperada da política, não uma asserção incorreta.
2. **Green**: após a implementação mínima da matriz e do matcher de rota, o mesmo comando passou: 1 arquivo, 4 testes, 0 falhas.
3. **Refactor**: a origem de tipos foi extraída para `types/auth.ts`; o contexto passou a consumi-la sem mudança runtime. O teste da política continuou verde.

## Comandos e resultados finais

```powershell
npm.cmd test -- professional-workspace.test.ts # PASS: 4/4
npm.cmd run lint                               # PASS: zero warnings
npm.cmd run typecheck                          # PASS
git diff --check                               # PASS
```

## Self-review

- A política compara segmentos de rota, sem liberar falsos prefixos como `/dietas-extra`.
- Os dez prefixes role-only exigidos foram preservados literalmente.
- As rotas comuns e a exceção de `visao-360` seguem a separação aprovada.
- Os testes usam a política real, expectativas literais e não usam mocks.
- O diff contém somente arquivos exigidos pela Tarefa 1 e não altera páginas legadas.

## Concerns

- A instalação reportou 17 vulnerabilidades transitivas (`4 moderate`, `12 high`, `1 critical`); nenhuma correção automática foi aplicada, pois o escopo era restaurar gates sem atualizar/remover dependências runtime.
- O lint legado original continha 33 erros e 2 warnings: `react-hooks/exhaustive-deps` (2), `react-hooks/immutability` (6), `react-hooks/purity` (10), `react-hooks/set-state-in-effect` (5) e `react/no-unescaped-entities` (12). Os cinco overrides são uma ponte de compatibilidade explícita; todo código novo da fundação é avaliado estritamente por essas mesmas regras.
- Vitest/ESLint precisam ser executados fora do sandbox desta sessão porque esbuild resolve o caminho absoluto do config; isso não é uma limitação do repositório.
