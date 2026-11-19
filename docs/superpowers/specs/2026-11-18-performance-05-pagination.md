# Performance 05 — escopo e contratos

Objetivo: listas de clientes, laudos e pedidos em lotes limitados, com navegação e filtros globais, sem perder seletores, KPIs ou pontos de gráficos. Solicitação do mantenedor em 18/11/2026; execução e publicação na branch de performance já autorizadas. Sem deploy/migrations/RLS/grants de produção.

- Página padrão 25, máximo 100, página positiva inteira; paginação por offset com ordenação original e ID como desempate. Medir planos antes/depois e navegação profunda para avaliar adequação; nenhum índice novo é pressuposto.
- `GET /clients`: array de Client preservado, headers `X-Pagination-Page`, `X-Pagination-Page-Size`, `X-Pagination-Total`; filtros status e q (nome/email/telefone/objetivo). WHERE sempre professionalId da sessão.
- `GET /lab-exams`: envelope `items`, `pagination`, `summary`, `markerNames`; filtros globais q/cliente/status/categoria. Classificação ClinicalResponse resource-page existente, sem mudar validador/limite1000. Filtros usam as mesmas referências clínicas da interface, com teste de paridade.
- Indicadores independem da página/filtro, como antes: total de laudos, clientes com exames, cobertura sobre clientes ativos, marcadores alterados e pedidos. Agregação SELECT no contexto/RLS já existente, sem carregar todos os exames no frontend.
- `GET /lab-exams/client/:clientId`: array com headers de paginação, ordem date/id asc. O gráfico reúne lotes necessários para manter todo o histórico autorizado.
- `GET /lab-exams/longitudinal`: array de pontos com clientId, nome de cliente, data, marcador, valor/unidade; filtros marcador/cliente, páginas, date/id asc. Só carrega ao abrir o gráfico e reúne seus pontos, sem laudos completos.
- `GET /lab-orders`: array com headers de paginação e issuedAt/id desc; UI de pedidos tem navegação independente.
- Seletores/relatórios que precisam de todos os clientes recebem coleção formada por lotes limitados. Não substituir seus totais pelos primeiros25.
- Frontend tolera contratos antigos (arrays sem metadados); cliente antigo rejeita parâmetros desconhecidos: fallback apenas para essa resposta400 de compatibilidade, preservando status. Implantação futura: frontend compatível antes da API; não implantar só a API com frontend antigo.
- Cache por profissional/filtros/página; sem placeholder de outra conta. Reiniciar página em mudança de filtros, ajustar última página vazia após exclusão, invalidar páginas/indicadores após mutações.
- Segurança: guards, autenticação, filtros de dono, RLS, limites de ClinicalResponse e no-store preservados. Não há novos endpoints públicos.
- TypeScript sem any novo; comentários/documentação em português; nenhuma dependência nova.

Aceite: endpoints novos limitam também chamadas sem parâmetros; páginas altas e filtros fora do primeiro lote funcionam; KPIs e gráficos globais conferem; contaB não acessa dados/metadados de A. Banco PostgreSQL sintético e navegador, builds/lint/tipos/suítes, métricas de linhas/bytes/tempo e EXPLAIN SELECT; commits pequenos e push na mesma branch.
