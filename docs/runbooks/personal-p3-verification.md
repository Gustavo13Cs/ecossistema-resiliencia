# Verificação do Personal P3

Data: 24/10/2026. Branch: `agent/codex/personal-p3`.
Estado: validação integrada concluída; correções da revisão final em andamento.

## Escopo

Direção aprovada pelo mantenedor em 23/10/2026:
[especificação](../superpowers/specs/2026-10-23-personal-p3-design.md) e
[plano](../superpowers/plans/2026-10-23-personal-p3.md).

- Monitor de volume semanal com frequência por divisão, contribuição direta e
  sinérgica, cobertura parcial, referências e snapshot calculado no servidor.
- Modelos globais/privados imutáveis, filtros, prévia, sanitização de dados da
  ficha e cópia para rascunho com IDs novos na finalização.
- Periodização opcional de 4–12 semanas, progressão, deload, leitura por semana
  e impressão na ficha atual do personal.
- Compatibilidade de rascunhos V1/V2 com novas escritas V3, 64 KiB, versão/CAS,
  conflitos OPEN, histórico e bloqueio de prontuário arquivado preservados.

## Evidências disponíveis antes das correções finais de interface

| Gate | Resultado |
| --- | --- |
| API unitários | 755/755, 60 suítes |
| PostgreSQL/HTTP/RLS | 253/253, 39 suítes |
| Web unitários/componentes/hooks | 734/734, 95 arquivos, `TZ=UTC` |
| Tipos web | `npm run typecheck`, saída 0 |
| Lint API/web | ESLint sem `--fix`, saída 0 |
| Build NestJS/Next.js | Saída 0 |
| Produção local: CSP/nonces/contrato de direção | 31/31 páginas |
| Bundle standalone | Verificado sem árvores de desenvolvimento ou `.env` |
| Chromium/Playwright com serviços/banco reais | 8 verificações concluídas |

Os logs estão em `.superpowers/sdd/2026-10-23-personal-p3/` durante a execução;
ao concluir, serão arquivados em
`.superpowers/artifacts/personal-p3/implementation-evidence/`.

## Jornada real no navegador

Executada com Chromium instalado, Playwright, build de produção da web, API
compilada e PostgreSQL 16 sintético em `127.0.0.1:5434`.
O runtime usa LOGINs clínico/auth/jobs sem BYPASSRLS e sem URL do owner.

1. Login PERSONAL por formulário e cookies reais.
2. Alteração de frequência atualiza volume; salvar/reabrir conserva V3 e data.
3. Consulta da semana 8 exibe deload, séries projetadas e valores base intactos.
4. Impressão A4 da semana consultada, com controles interativos ocultos.
5. Salvar modelo exclui notas, cargas, identidade e data inicial da periodização.
6. Filtrar/visualizar/importar para outro aluno e adaptar não altera a origem;
   a nova ficha recebe IDs próprios.
7. Falha HTTP 503 conserva o formulário; nova tentativa salva.
8. Conta B não lê/importa modelo A nem consulta a ficha A; nenhum conteúdo
   clínico é persistido no armazenamento local do navegador.

A inspeção desktop/mobile confirmou ausência de overflow horizontal da página.
Artefatos locais: `.superpowers/artifacts/personal-p3/desktop-final.png`,
`mobile-final.png`, `periodization-deload.pdf`, `result.json`, `checks.log` e
`browser-real.cjs`. Contêm somente fixtures sintéticas. O PDF tem formato A4;
a semana de recuperação e os valores base foram conferidos no texto extraído.

O script verifica que as portas estão livres, mantém as configurações de proxy,
inicia somente processos próprios e limpa apenas fixtures do prefixo `Task7 P3`
da conta sintética conhecida. Não acessa produção.

## Cypress e ambiente

Os cenários Cypress estão versionados em
`web/cypress/e2e/personal-p3-real.cy.ts`. O binário não estava instalado e o
download de `download.cypress.io` foi negado pelo proxy com HTTP 403. Não houve
contorno da política de rede. A validação real equivalente foi feita com o
Chromium/Playwright já disponíveis. A execução pelo runner Cypress permanece
pendente em um ambiente que disponibilize o binário.

## Correções e revisão

- Volume web: revisão independente aprovada, sem achados materiais.
- API de modelos: revisão independente aprovada; RLS verificada com dois
  profissionais, LOGIN clínico e LOGIN com negação de Data API.
- Interface de modelos: a revisão identificou prévia incompleta das fases;
  corrigida em `db07862`, com RED de 2 casos e GREEN de 15 testes. Rerevisão
  aprovou nomes, tipos, intervalos, esforço e fuso, sem data inicial clínica.
- A inspeção visual encontrou objetivo importado como enum. A correção
  `5ba009b` traduz somente a cópia para português, preservando metadata e
  snapshot do modelo. RED de 4 unitários e 1 E2E; GREEN de 7 unitários e 9 E2E.
- A revisão ampla identificou ausência de prévia semanal no editor e ausência
  do intervalo civil da semana na impressão. Uma única onda de correções está
  em execução; gates e evidências serão atualizados após a integração.

## Testes antigos dependentes do fuso do executor

A primeira suíte ampla da web apresentou 4 falhas: um caso de
`useFollowUps.test.ts` e três de `usePersonalDayAgenda.test.tsx`.

O caso de retornos usava 23h em UTC−3, que cai no dia seguinte no executor UTC,
mas esperava o mesmo dia do calendário local. A fixture passou a construir
instantes no fuso do calendário que o teste exercita, sem alterar produção.

Os testes de agenda espiavam o prototype de `Intl.DateTimeFormat`, enquanto o
construtor instalado pelos fake timers podia devolver outra instância nativa.
O mock agora controla o construtor e preserva o fuso explícito dos formatadores.
As duas fixtures passam em UTC e em `America/Fortaleza` (8 + 3 testes em cada
fuso), e a suíte ampla posterior passou com 734 testes.

## Decisões de execução e limites

- Consulta e impressão permanecem na ficha do personal, conforme escolha do
  mantenedor; a entrega não cria portal de aluno.
- A menção inicial a auditoria foi corrigida para classificação/validação de
  ownership. `docs/SECURITY.md:94` registra a retirada explícita do histórico de
  leituras em 08/10/2026; P3 preserva essa decisão. Reintroduzir uma trilha
  persistente exigiria outro escopo.
- A ausência do intervalo civil impresso foi tratada junto da prévia ausente:
  a ficha semanal precisa identificar quando a semana consultada se aplica.
- O aviso TS151002 do ts-jest já existia e não impede os testes; fica adiado para
  manutenção da configuração. O verificador de produção existente também emite
  o aviso de `next start` com output standalone, mas verifica o bundle separado.
- Schema e migrations foram alterados com aprovação e aplicados somente ao
  PostgreSQL sintético. Não houve push, merge, deploy ou migration em produção.
