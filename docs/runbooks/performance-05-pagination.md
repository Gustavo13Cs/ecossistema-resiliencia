# 05 — Paginação de clientes e exames

Implementação iniciada em 18/11/2026 na branch `agent/codex/performance-diagnosis`, a partir de `4a7d175`. Validação final em 19/11/2026. Nenhum deploy ou comando em banco de produção.

## Contratos e comportamento

- `GET /clients`: array, `page=1`, `pageSize=25`, máximo de 100; `status` e `q` aplicados no servidor sobre toda a base privada. Ordenação por nome, criação descendente e ID. Cabeçalhos `X-Pagination-Page`, `X-Pagination-Page-Size`, `X-Pagination-Total`.
- `GET /lab-exams`: `{items,pagination,summary,markerNames}`. Busca, cliente, status clínico e categoria aplicados antes do limite. Data e ID descendentes. `summary` e nomes de marcadores abrangem todos os laudos autorizados, independentemente dos filtros/página.
- Histórico por cliente e pedidos: arrays com os mesmos limites/cabeçalhos; histórico ascendente por data/ID e pedidos descendentes por emissão/ID.
- `GET /lab-exams/longitudinal`: pontos leves de um marcador, ordenados por data/ID, com os mesmos limites. Nomes comparados literalmente, sem expansão de `%`, `_` ou `\`; espaços e interpretação clínica existentes preservados. Carregamento apenas ao montar o gráfico.
- As duas listas principais e o histórico de pedidos possuem navegação anterior/próxima e contagem global. Filtros/conta reiniciam a página; remoções ajustam uma última página que deixou de existir. Controles permanecem montados durante carregamento/erro para preservar foco e digitação.
- Consumidores que precisam da coleção completa (`useClients` para seletores/indicadores e `useLabExams` para histórico) percorrem lotes de 100 com até quatro requisições simultâneas. Não convertem falhas ou mudança de contagem em coleção parcial. HTTP429 respeita `Retry-After`, retoma o mesmo lote e permite cancelamento; limite do servidor permanece intacto.
- Referências clínicas foram espelhadas no backend com teste de paridade dos valores e fronteiras contra o dicionário existente do frontend. Filtro de status e categoria continuam podendo corresponder a marcadores diferentes do mesmo laudo. Marcador desconhecido continua com a classificação anterior.
- O agregado SQL parametrizado reutiliza os IDs da página sem filtros para evitar uma segunda varredura integral de laudos; mantém contexto clínico, RLS e filtros de autoria/profissional. Sem schema, índice ou migration novos. O validador clínico continua limitado a 1.000 referências por resposta; cada página tem no máximo de 100.
- CORS expõe apenas os cabeçalhos de paginação e `Retry-After` para as origens já autorizadas; autenticação, credenciais, origem, permissões e políticas RLS permanecem iguais. A central inteira remonta na troca de conta, descartando filtros e detalhes clínicos anteriores.

## Medição reproduzível

HTTP local com NestJS e PostgreSQL16, dados sintéticos e papéis restritos/RLS reais. Sessão JWT simulada somente no fixture. São 600 clientes, 600 laudos, 1.200 marcadores e 60 pedidos de um profissional, mais registros de outra conta para verificar exclusão. As quatro tabelas sintéticas recebem `ANALYZE` antes de cada rodada para evitar mudança de plano durante a amostragem por estatísticas antigas. Dois aquecimentos e cinco amostras por endpoint; bytes de JSON descomprimido, sem confundir com transferência Brotli/Gzip ou latência de produção.

O baseline usa o código anterior `4a7d175` em snapshot isolado. O runner executa apenas o benchmark com `PERF05_PHASE=before`. O código novo usa exatamente o mesmo fixture com `PERF05_PHASE=after`. Os resultados e os planos `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` ficam ao lado em `evidence/performance-05/`. Os SELECTs de pais em `plans.clients/exams` são consultas equivalentes para isolar ordenação/limite; `plans.summary` é o SELECT agregado usado pela implementação. Nenhum EXPLAIN executa escrita.

| Endpoint | Registros antes → depois | JSON antes → depois (bytes) | Redução de bytes | Mediana HTTP antes → depois |
|---|---:|---:|---:|---:|
| `/clients` | 600 → 25 | 865.794 → 36.076 | 95,83% | 46,81 → 21,61 ms |
| `/lab-exams` | 600 → 25 | 758.636 → 31.897 | 95,80% | 128,87 → 130,93 ms |
| `/lab-orders` | 60 → 25 | 26.761 → 11.151 | 58,33% | 11,37 → 15,44 ms |

Clientes reduziram a mediana HTTP local em 53,83%. Exames não mostraram ganho de latência: +2,06ms (+1,60%) nesta amostragem. Pedidos ficaram 4,07ms (+35,84%) mais lentos: o custo da contagem global exata supera a economia de serializar 35 registros a menos nessa base pequena. A melhoria comprovada para essas duas rotas é limitar registros por resposta e bytes de JSON, reduzir os itens renderizados por página e permitir navegação; não se afirma redução do tempo de servidor. Se a prioridade for exclusivamente a latência desse histórico pequeno, o rollback descrito abaixo permite desfazer a etapa; a paginação foi mantida para cumprir os limites e os cenários de crescimento validados.

Os planos completos estão em [before-api.json](evidence/performance-05/before-api.json), [after-api.json](evidence/performance-05/after-api.json) e [high-volume-api.json](evidence/performance-05/high-volume-api.json).

- Clientes, SELECT de pais equivalente: 600 → 25 linhas retornadas; execução SQL 8,297 → 6,622 ms. O limite não elimina a leitura/ordenação necessária nem o trabalho das policies.
- Exames, SELECT de pais equivalente: 600 → 25 linhas retornadas; execução SQL 36,125 → 38,845 ms. O limite não elimina a leitura/ordenação necessária nem o trabalho das policies.
- SELECT agregado real de exames: 131,670 ms; inclui varredura dos marcadores autorizados para manter indicadores globais. Não comparável isoladamente ao SELECT anterior, que não fazia agregação.
- `/clients` em 1.105 registros: 12 páginas, 1105 IDs únicos, última página 34,01 ms; respostas com até 100 registros.
- `/lab-exams` em 1.105 registros: 12 páginas, 1105 IDs únicos, última página 188,71 ms; respostas com até 100 registros.

O teste adicional percorre 1.105 clientes e 1.105 exames em 12 páginas de 100, contando IDs únicos e verificando limites. Registra duração da última página e planos com OFFSET1100. Offset é adequado ao volume validado; não fornece um snapshot imutável entre requisições quando outras sessões inserem/alteram registros. Avaliar cursor e ordenação indexada se o crescimento observado justificar.

## Verificações

- API: 820 testes unitários em 64 suítes aprovados; build e lint aprovados.
- PostgreSQL/RLS: 265 testes funcionais em 42 suítes aprovados com `NODE_OPTIONS=--max-old-space-size=4096`; duas verificações optativas (benchmark e navegador) executadas separadamente e aprovadas. O limite de heap se aplica apenas ao processo local de teste.
- Benchmark isolado: baseline 1 aprovado; implementação 10 aprovados, incluindo medição, 1.105 registros, igualdade literal de nomes, fronteiras clínicas e CORS. Dois aquecimentos e cinco amostras; estatísticas sintéticas atualizadas antes de cada rodada.
- Frontend: 787 testes da suíte completa em 103 arquivos aprovados; mais 2 regressões novas de compatibilidade/ownership de séries aprovadas em execução focada. Tipos e lint aprovados, incluindo o arquivo novo.
- Build Next.js de produção aprovado, com verificação de 32/32 páginas servidas e pacote standalone isolado sem árvore de desenvolvimento/arquivos de ambiente.
- Chromium com build de produção, API local e RLS real: 1440×900 e 390×844 aprovados. Navegação/busca em toda a base, digitação contínua sob latência, arquivar/restaurar, totais globais, filtros em marcadores distintos, pedidos e 600 pontos longitudinais. Nenhum erro JavaScript não tratado. [Roteiro e evidência](evidence/performance-05/browser-after.json).
- Regressões focadas verificam manutenção do foco durante loading/erro, reinício após troca de conta, clamp da última página, falhas em lote sem coleção parcial, 429/Retry-After/cancelamento e fallback somente para API/rota antiga.
- Uma primeira execução misturando testes/builds teve timeout em um teste de treino; a repetição completa isolada passou. PostgreSQL excedeu o heap padrão de 2 GB antes do ajuste local. Uma tentativa de medir durante a suíte também excedeu 30 s e mostrou planos instáveis por estatísticas antigas; o benchmark passou a ser optativo/isolado, com `ANALYZE` do fixture. Nenhum resultado dessas tentativas foi usado na tabela final.

A revisão independente encontrou problemas de foco, comparação literal de nomes, troca de conta, exposição de cabeçalhos e limite de requisições dos lotes. Todos receberam correção e regressões focadas. A sessão do revisor foi interrompida pelo limite do serviço antes de emitir um veredito final; a conferência final e a execução das regressões foram feitas pelo executor.

## Reprodução local

Usar exclusivamente `postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test`, como exigem os fixtures de isolamento. Subir o PostgreSQL de teste e aplicar as migrations já existentes nesse banco descartável; nenhuma migration nova foi criada.

```bash
# Na raiz do repositório, com o banco de teste preparado:
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
DIRECT_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
PERF05_PHASE=after PERF05_EVIDENCE_DIR=../docs/runbooks/evidence/performance-05 \
npm --prefix api run test:e2e -- --runTestsByPath test/list-pagination.e2e-spec.ts

# Build e servidor frontend local, em terminais separados:
NEXT_PUBLIC_API_URL=http://localhost:3000 npm --prefix web run build
NEXT_PUBLIC_API_URL=http://localhost:3000 npm --prefix web run start -- -p 3106

# O fixture abre a API local e executa o driver de Chromium instalado:
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
DIRECT_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
PERF05_UI_ORIGIN=http://127.0.0.1:3106 \
npm --prefix api run test:e2e -- --runTestsByPath test/list-pagination.e2e-spec.ts -t 'validates browser'
```

Para repetir o baseline sem trocar a branch, executar `python3 docs/runbooks/evidence/performance-05/prepare-baseline.py --dest /tmp/perf05-baseline-new`. O script exige destino vazio fora do checkout, extrai `4a7d175`, reutiliza as dependências instaladas e adapta somente os imports auxiliares do fixture. Executar `npm --prefix /tmp/perf05-baseline-new/api run test:e2e -- --runTestsByPath test/list-pagination.e2e-spec.ts -t 'measures payloads'` com as duas URLs locais acima, `PERF05_PHASE=before` e `PERF05_EVIDENCE_DIR` apontando por caminho absoluto para a pasta de evidências. O modo before não executa os stubs do agregado novo. Nunca apontar os testes para Supabase/produção. O driver exige localhost e não usa senhas nem sessão de produção.

## Publicação futura e rollback

A API muda o corpo do agregado de laudos: publicar primeiro o frontend compatível com a API antiga e depois a API nova. A compatibilidade de clientes aceita somente o400 de propriedades novas não suportadas; gráficos fazem fallback apenas no404 de rota inexistente, preservando erros de acesso. Respostas antigas são filtradas/paginadas localmente durante a transição, ainda com os custos anteriores.

Esta entrega publica somente a branch. Em um rollback posterior de deploy, restaurar primeiro a API anterior e depois o frontend anterior. Também é possível reverter os commits desta entrega, sem SQL de rollback: não existe alteração de banco. Manter esse pareamento evita frontend antigo consumindo o novo envelope.

## Teste manual

1. Em Clientes com mais de25 registros, avançar e voltar; buscar um nome, contato ou objetivo da última página. Repetir em Arquivados.
2. Arquivar/restaurar com confirmação, inclusive o último registro da última página; conferir total e página ajustados.
3. Em Exames, navegar e digitar uma busca continuamente com rede lenta. Combinar cliente, status e categoria; limpar filtros. Confirmar totais globais e marcador personalizado fora da página inicial.
4. Abrir Pedidos Emitidos, avançar e voltar; emitir/remover pedido e confirmar indicador global atualizado. Cadastrar/remover um laudo e confirmar lista e gráfico atualizados.
5. Abrir Comparativo Longitudinal; trocar marcador/cliente e conferir pontos de datas antigas. Testar nome personalizado com `%`, `_`, barra e espaços.
6. Trocar a conta com filtro e detalhes abertos; nenhum dado ou filtro clínico da conta anterior deve aparecer.

## Limites e melhorias futuras

Não se mediu LCP, RTT regional ou produção autenticada nesta entrega. A redução de payload por página é o resultado verificável; os seletores que ainda precisam de todos os clientes e os gráficos que precisam de todo o histórico continuam percorrendo a coleção em lotes. Um endpoint compacto de opções, agregados persistidos e cursor para volumes maiores podem reduzir esse custo em outra tarefa, mediante medição.

## Arquivos desta entrega

Nenhuma migration ou dependência alterada.

- `api/src/common/pagination/page-query.dto.ts`
- `api/src/common/pagination/pagination.ts`
- `api/src/main.ts`
- `api/src/modules/clients/clients.controller.spec.ts`
- `api/src/modules/clients/clients.controller.ts`
- `api/src/modules/clients/clients.service.spec.ts`
- `api/src/modules/clients/clients.service.ts`
- `api/src/modules/clients/dto/list-clients-query.dto.ts`
- `api/src/modules/lab-exams/dto/list-lab-exams-query.dto.ts`
- `api/src/modules/lab-exams/lab-exam-filters.ts`
- `api/src/modules/lab-exams/lab-exam-summary.ts`
- `api/src/modules/lab-exams/lab-exams.controller.ts`
- `api/src/modules/lab-exams/lab-exams.service.ts`
- `api/src/modules/lab-exams/lab-marker-reference.spec.ts`
- `api/src/modules/lab-exams/lab-marker-reference.ts`
- `api/src/modules/lab-orders/lab-orders.controller.spec.ts`
- `api/src/modules/lab-orders/lab-orders.controller.ts`
- `api/src/modules/lab-orders/lab-orders.service.ts`
- `api/src/modules/supplements/clinical-items.controller.spec.ts`
- `api/test/client-owned-clinical-resources.e2e-spec.ts`
- `api/test/list-pagination.e2e-spec.ts`
- `docs/TASKS.md`
- `docs/agents/CODEX_STATUS.md`
- `docs/runbooks/evidence/performance-05/after-api.json`
- `docs/runbooks/evidence/performance-05/before-api.json`
- `docs/runbooks/evidence/performance-05/browser-after.json`
- `docs/runbooks/evidence/performance-05/high-volume-api.json`
- `docs/runbooks/evidence/performance-05/verify-pagination.py`
- `docs/runbooks/performance-05-pagination.md`
- `docs/superpowers/plans/2026-11-18-performance-05-pagination.md`
- `docs/superpowers/specs/2026-11-18-performance-05-pagination.md`
- `web/app/clientes/clientes-page.test.tsx`
- `web/app/clientes/page.tsx`
- `web/app/exames/page.tsx`
- `web/app/exames/pagination.test.tsx`
- `web/components/features/clients/ClientDirectory.test.tsx`
- `web/components/features/lab-exams/LongitudinalMarkerChart.tsx`
- `web/components/features/training/PersonalDashboard.test.tsx`
- `web/components/features/training/WorkoutClientPicker.test.tsx`
- `web/components/feedback/PaginationControls.tsx`
- `web/hooks/features/list-pagination.test.tsx`
- `web/hooks/features/useCentralLabExams.test.ts`
- `web/hooks/features/useCentralLabExams.ts`
- `web/hooks/features/useClients.ts`
- `web/hooks/features/useLabExams.test.tsx`
- `web/hooks/features/useLabExams.ts`
- `web/hooks/features/useLabMarkerSeries.compat.test.tsx`
- `web/hooks/features/useLabMarkerSeries.ts`
- `web/hooks/features/useListPage.ts`
- `web/hooks/features/useProfessionalDashboard.test.tsx`
- `web/lib/pagination.test.ts`
- `web/lib/pagination.ts`

- `docs/runbooks/evidence/performance-05/prepare-baseline.py` (adaptador reprodutível do baseline, validado em diretório isolado).
