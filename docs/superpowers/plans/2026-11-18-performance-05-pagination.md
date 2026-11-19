# Paginação de clientes e exames — plano de implementação

> Para execução por agentes: usar superpowers:executing-plans, em execução nativa contínua já autorizada. Uma revisão independente do delta inteiro encerra a implementação.

**Objetivo:** limitar os endpoints e apresentar páginas navegáveis, mantendo totais, histórico e isolamento.
**Arquitetura:** DTO comum page/pageSize25/máximo100, arrays+headers para contratos de clientes/histórico/pedidos e envelope resource-page para laudos com metadados globais. Hooks separam listas paginadas de coleções completas necessárias e carregam pontos longitudinais sob demanda. Sem migrations.
**Stack:** NestJS/Prisma/PostgreSQL; Next/React/TanStack Query existentes.
**Spec:** `docs/superpowers/specs/2026-11-18-performance-05-pagination.md`.

## Restrições globais

- Não quebrar funcionalidade; nenhum dado/totais cortado silenciosamente.
- Não afrouxar RLS/autenticação/permissões; TypeScript sem any novo, comentários em português.
- Medir antes/depois; usar só banco sintético, sem SQL em produção.
- Branch `agent/codex/performance-diagnosis`, commits pequenos e push final; sem deploy de produção.

## Foco da revisão

- Nomes/datas iguais e inserções/arquivamento: ordem determinística, sem repetir/perder registros na travessia estática; última página ajustável após mutação.
- Conta e filtros mudando durante fetch: nenhum cache/resposta da conta anterior aparece.
- Filtros clínicos independentes em marcadores diferentes, nomes desconhecidos e limites exatos: mesma semântica da UI atual.
- Clientes >1000 e filtros com %, _ ou acentos: acesso paginado íntegro sem relaxar guard1000, busca literal.
- API antiga ou falha em lote intermediário: compatibilidade explícita, sem apresentar totais parciais como coleção completa.

## Tarefa 1 — baseline e API de clientes

Arquivos: `api/test/list-pagination.e2e-spec.ts`, `api/src/common/pagination/{page-query.dto,pagination}.ts`, clients DTO/service/controller e testes.
Interfaces: PageQueryDto(page=1,pageSize=25), PaginationMeta{page,pageSize,total,pageCount}, PagedResult<T>{items,pagination}; paginationValues rejeita inválidos e >100. ClientsService.findPage(user,query) usa dono/status/q e name asc/createdAt desc/id asc. Controller mantém array com headers.

- [x] Escrever teste HTTP/PG antes da alteração: 600 clientes/exames sintéticos; payload/tempo/EXPLAIN antes, páginas, filtros e contaB. Rodar baseline: falta de paginação deve falhar nos casos novos, com métricas arquivadas.
- [x] Escrever regressões de validação/ordenamento/escopo, observar RED.
- [x] Implementar DTO/helpers e clientes limitados; ajustar contratos unitários legítimos.
- [x] Rodar testes focados e API build/lint; esperado: verdes. Commit de API de clientes.

## Tarefa 2 — API de laudos, indicadores, pontos e pedidos

Arquivos: lab-exams DTO/service/controller, `lab-marker-reference.ts`, `lab-exam-filters.ts`, `lab-exam-summary.ts`, respectivos testes; lab-orders service/controller e testes.
Interfaces: LabExamPage{items,pagination,summary,markerNames}; summary global com totalExams/clientsWithExamsCount/alteredMarkersCount/ordersIssuedCount. LabPoint{id,clientId,clientName,date,name,value,unit}. Filtros Prisma mantêm creatorId+client.professionalId. SELECT de agregados usa o contexto atual. Referências espelhadas de web/types/lab-exam com comparação de dados/classificação em teste, sem dependência runtime entre builds.

- [x] Escrever regressões das fronteiras clínicas/indicadores globais, marcadores em itens distintos, isolamento e limite de histórico/pedidos; observar RED.
- [x] Implementar findPage, summary e longitudinal; manter histórico/pedidos arrays com headers, defaults25/máximo100 e desempate ID.
- [x] Rodar unitários/API build e testes HTTP/RLS focados; esperado: limites, contas e classificações corretos. Commit de API de exames.

## Tarefa 3 — hooks e páginas navegáveis

Arquivos: web/lib/pagination.ts, hooks de páginas/coleções completas, useClients, useCentralLabExams, useLabExams, useLabMarkerSeries; query-keys, tipos, PaginationControls, clientes/page, exames/page, LongitudinalMarkerChart e testes.
Interfaces: array paginado normalizado com headers, compatibilidade legada, coleta completa em lotes; hooks de página retornam items/pagination/page/setPage/estado. Query keys incluem sub/status/q/cliente/categoria/página. Gráfico recebe marcador e cliente, consulta pontos ao montar. KPIs globais vêm de metadados; cobertura conserva total de clientes ativos, pedidos invalidam o agregado.

- [x] Escrever regressões: navegar >1 página, pesquisar além da primeira, status/conta reiniciam página, falha intermediária não retorna coleção parcial, compatibilidade e mutações; observar RED.
- [x] Implementar adaptadores e hooks; preservar contrato data Client[] para consumidores completos.
- [x] Adaptar listas/controles e carregar gráfico sob demanda; indicador global não deriva de items.length.
- [x] Rodar testes focados, tipos/lint/build; esperado: estados e navegação íntegros. Commit do frontend.

## Tarefa 4 — volume, navegador e revisão final

Arquivos: fixture/benchmark local, evidência `docs/runbooks/evidence/performance-05/`, runbook e status.

- [x] Repetir o benchmark com a mesma base e arquivar linhas/bytes/tempos e EXPLAIN SELECT; atravessar >1000 e páginas altas, sem duplicatas/fora de escopo.
- [x] Validar no Chromium clientes, arquivados, filtros de exames, totais, páginas de pedidos, gráfico e mutações com API local/RLS.
- [x] Executar suítes completas API/PG/web, builds, lint e tipos. Esperado: zero falhas; documentar limitações reais.
- [x] Revisão independente do delta desde `4a7d175`, com foco nos cinco riscos; corrigir achados importantes com RED→GREEN, repetir checks afetados.
- [x] Atualizar relatório, ledger/status, commits e push; confirmar remoto e árvore limpa. Nenhuma publicação de produção.

## Fechamento em19/11/2026

Etapas1–3 implementadas e verificadas. Etapa4 cumprida com dados sintéticos, comparação isolada em snapshot antigo e novo,1105 registros, navegador desktop/mobile e suítes completas. A revisão independente recebeu cinco achados, corrigidos com regressões; a sessão encerrou pelo limite do serviço antes do veredito, e o executor concluiu a conferência. Resultados/limitações registrados em `docs/runbooks/performance-05-pagination.md`. A evidência não demonstrou ganho de latência em exames/pedidos; a paginação e redução de bytes foram comprovadas. Publicação apenas da branch autorizada, sem deploy.
