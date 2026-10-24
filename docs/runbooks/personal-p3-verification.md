# Verificação do Personal P3

Data: 24/10/2026. Branch: `agent/codex/personal-p3`.
Estado: implementação e validação local concluídas, incluindo as correções da
revisão final. Branch mantida para revisão do mantenedor.

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

## Resultado final

| Gate | Resultado |
| --- | --- |
| API unitários | 755/755, 60 suítes |
| PostgreSQL/HTTP/RLS | 253/253, 39 suítes |
| Web unitários/componentes/hooks | 748/748, 95 arquivos, `TZ=UTC` |
| Tipos web | `npm run typecheck`, saída 0 |
| Lint API/web | ESLint sem `--fix`, saída 0 |
| Build NestJS/Next.js | Saída 0 |
| Produção local: CSP/nonces/contrato de direção | 31/31 páginas |
| Bundle standalone | Verificado sem árvores de desenvolvimento ou `.env` |
| Chromium/Playwright com serviços/banco reais | 9 verificações concluídas; nenhum erro JavaScript não tratado |
| Revisão independente | Revisão ampla + correção dos dois achados + rerevisão aprovada |

Os logs, relatórios de revisão e ledger estão arquivados em
`.superpowers/artifacts/personal-p3/implementation-evidence/`.
Os resultados finais estão em `release-api-unit.log`,
`release-api-postgres.log`, `release-api-build.log`, `release-api-lint.log`,
`complete-web-unit.log`, `complete-web-types.log`, `complete-web-lint.log` e
`complete-web-build.log` nesse diretório. Logs de falhas anteriores foram
preservados junto aos resultados corrigidos.

As fontes de aplicação verificadas correspondem a `8fee396`; a API permanece
inalterada desde `5ba009b`, já abrangida pelos 755/253 testes. O digest das fontes
foi conferido contra o registro anterior ao último build web e vinculado ao
`BUILD_ID` antes da jornada final. Digest SHA-256:
`654e552a3a16a4e63556c8b2b813f68ff5237ecffa61dbd6ceb937536b4f3b7c`.
O arquivo local `verification-summary.json`, no diretório de artefatos,
identifica a revisão, o build e as evidências. Alterações posteriores deste
fechamento são documentais.

## Jornada real no navegador

Executada com Chromium instalado, Playwright, build de produção da web, API
compilada e PostgreSQL 16 sintético em `127.0.0.1:5434`.
O runtime usa LOGINs clínico/auth/jobs sem BYPASSRLS e sem URL do owner.

1. Login PERSONAL por formulário e cookies reais.
2. Prévia antes de finalizar: semana 3 mostra `7-9` repetições/RIR 2 e semana 8
   mostra deload/RIR 4-5; seleção não faz HTTP e conserva as 4 séries base.
3. Alteração de frequência atualiza volume; salvar/reabrir conserva V3 e data.
4. Consulta da semana 8 exibe 2 séries projetadas contra 4 base; impressão A4
   conserva a semana e o intervalo de 11/12/2026 a 17/12/2026, com o botão de
   impressão oculto.
5. Salvar modelo exclui notas, cargas, identidade e data inicial da periodização.
6. Filtrar/visualizar/importar para outro aluno e adaptar não altera a origem;
   o objetivo é apresentado como “Hipertrofia” e a nova ficha recebe IDs próprios.
7. Ficha desktop/mobile sem overflow horizontal da página.
8. Falha HTTP 503 conserva o formulário; nova tentativa salva.
9. Conta B não lê/importa modelo A nem consulta a ficha A; nenhum conteúdo
   clínico é persistido no armazenamento local do navegador.

A inspeção desktop/mobile confirmou ausência de overflow horizontal da página.
Artefatos locais: `.superpowers/artifacts/personal-p3/desktop-final.png`,
`mobile-final.png`, `periodization-deload.pdf`, `result.json`, `checks.log` e
`browser-real.cjs`. Foram regenerados após `8fee396` e contêm somente fixtures
sintéticas. As capturas finais foram inspecionadas; o PDF tem quatro páginas A4.
A semana de recuperação, o intervalo civil e os valores base foram conferidos
no texto extraído.

O script verifica que as portas estão livres, mantém as configurações de proxy,
inicia somente processos próprios e limpa apenas fixtures do prefixo `Task7 P3`
da conta sintética conhecida. Não acessa produção.

## Cypress e ambiente

Os cenários Cypress estão versionados em
`web/cypress/e2e/personal-p3-real.cy.ts`. O binário não estava instalado e o
download de `download.cypress.io` foi negado pelo proxy com HTTP 403. Não houve
contorno da política de rede. Cabeçalhos do bloqueio foram preservados em
`.superpowers/artifacts/personal-p3/cypress-download-policy.log`.
A validação real equivalente foi feita com o
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
- A revisão ampla em `c9344ba` identificou ausência de prévia semanal no editor
  e do intervalo civil da semana na impressão. Ambos foram corrigidos em
  `8fee396`: RED de 13 casos → GREEN de 111 testes focados, tipos/lint aprovados.
  A prévia usa as regras puras e os exercícios reais do formulário, sem salvar,
  finalizar ou fazer HTTP; configurações parciais continuam salváveis.
- A rerevisão independente de `8fee396` aprovou a correção dos dois achados,
  sem novos problemas materiais. Depois dela, a suíte web completa, tipos,
  lint, build/pós-build e a jornada real foram executados novamente e passaram.
- Limite histórico da evidência: o log bruto do RED inicial da API de modelos
  não foi localizado pelo revisor; o relato do implementador e os resultados
  GREEN foram preservados. Não foi reconstruída uma evidência retroativa.
  Os RED/GREEN das correções posteriores e os gates finais estão registrados.

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
fuso). A suíte ampla intermediária passou com 734 testes; a suíte final, após
as correções de interface, passou com 748.

## Decisões de execução e limites

- A Task 4 foi delegada em paralelo à persistência da API por ter arquivos e
  interfaces distintos. Isso altera a execução, sem mudar produto ou escopo;
  o custo de integração foi coberto por revisão da tarefa e da branch inteira.
- Consulta e impressão permanecem na ficha do personal, conforme escolha do
  mantenedor. Portal de aluno, automação de carga/cron, gráficos longitudinais
  e edição/arquivamento de modelos foram excluídos pela especificação. Os
  pontos que a revisão não julgou por esse motivo foram encerrados como fora
  do escopo, sem gerar trabalho pendente desta entrega.
- A menção inicial a auditoria foi corrigida para classificação/validação de
  ownership. `docs/SECURITY.md:94` registra a retirada explícita do histórico de
  leituras em 08/10/2026; P3 preserva essa decisão. Reintroduzir uma trilha
  persistente exigiria outro escopo. A revisão confirmou esse fundamento; se a
  decisão de produto mudar, o custo será especificar e implementar o recurso
  separadamente, sem prejuízo dos objetivos do PDF.
- O achado de datas, inicialmente classificado como menor, foi elevado a
  importante e tratado junto da prévia: a ficha semanal precisa identificar
  quando a semana consultada se aplica. A alteração é apenas de apresentação
  de datas civis; se dispensável, seu custo se limita à linha adicional e aos
  testes correspondentes.
- A substituição da execução Cypress por Chromium/Playwright decorre do
  bloqueio HTTP 403 efetivamente observado. A jornada real foi validada, mas
  não comprova o funcionamento do runner Cypress; essa limitação permanece
  explícita até existir ambiente com o binário.
- O aviso TS151002 do ts-jest já existia e não impede os testes; fica adiado para
  manutenção da configuração. O verificador de produção existente também emite
  o aviso de `next start` com output standalone, mas verifica o bundle separado.
- Schema e migrations foram alterados com aprovação e aplicados somente ao
  PostgreSQL sintético: `20261023180000_personal_p3` e
  `20261023183000_workout_template_catalog`, com 24 migrations no banco local.
  O checkout e a branch foram mantidos. Não houve push, merge, deploy ou
  migration em produção; integração/publicação será uma decisão posterior.
- Capacidade, pooler, rollout e comportamento de produção não foram julgados
  nesta entrega local. A revisão cobriu migrations/grants/código e isolamento
  no PostgreSQL sintético. Certificação clínica e adequação individual dos
  sete modelos/referências também estão fora do escopo: são bases editáveis e
  referências gerais, conforme a especificação, sem certificação atribuída.
