# Auditoria de leitura e prova local de RLS

> Documento histórico. O mantenedor solicitou retirar Histórico de acessos em 2026-10-08; consulte [a remoção vigente](../../runbooks/remove-access-history.md). A proteção RLS/contexto continua vigente.

> Execute nesta conversa com superpowers:executing-plans. Aprovação local explícita do mantenedor em 2026-10-05, reiterada em 2026-10-06.

**Spec:** proposta v3, hash 8d97c7c0ab883ac72c88bff892c9b88dcca2293d9b454fb2c29f3befc2653ea1, no diretório persistente codex-security/hardening.

**Objetivo:** resposta clínica só depois do commit de acesso; isolamento por profissional em papel sem bypass; catálogo compartilhado seguro.
**Restrições:** trabalho neste worktree; sem alteração de migrations antigas, segredos, CI, compose de produção, deploy ou SQL remoto. D1-D3/D5/D7 e Fase 0 continuam gates de implantação. Testes sintéticos.
**Interfaces:** AuthUser.sessionId validado -> contexto ALS -> TransactionClient -> evento e outbox -> resposta. Jobs têm conexão e tarefa separadas. Runtime não pode ler auth_sessions nem alterar authVersion/password/role.

## Task 1: Sessão e fronteira transacional
- Testar contexto ausente, transação aninhada, rollback, isolamento concorrente e principal autenticado.
- Implementar fachada Prisma contextual e conexão pré-auth; manter resposta pública sem sessionId.
- Expected: regressões focais RED -> GREEN; typecheck sem supressão.
- Commit: feat: add authenticated clinical transaction boundary

## Task 2: Schema e papéis RLS locais
- Testar grants, tenant A/B sem filtro, filhos, modelos, legado nulo, RETURNING/upsert, GUC vazio, imutabilidade, catálogo e locks em PostgreSQL sintético.
- Criar migration nova com trilha/outbox, CHECKs, papéis NOLOGIN e policies. Auth separado, job restrito, função de catálogo com autoridade mínima.
- Expected: migrations reaplicáveis em banco vazio PG16/17; testes com LOGIN sintético NOBYPASSRLS e não-owner passam.
- Commit: feat: add tenant policies and immutable read audit storage

## Task 3: Cobertura HTTP e trilha
- Metadados obrigatórios por handler montado de qualquer método; exceções explícitas catálogo/perfil/modelos.
- Testar deduplicação, listagem completa, rollback por falha de audit e nenhuma resposta clínica antecipada.
- Implementar interceptor fail-closed, extratores explícitos, descoberta de rotas e consulta própria.
- Expected: testes HTTP reais e descoberta passam; caminhos raw e serviços usam mesma transação.
- Commit: feat: audit clinical responses before commit

## Task 4: Jobs, cópia e compatibilidade
- Ator SYSTEM permitido somente no job identificado; outbox separado, cópia idempotente após commit.
- Adaptar fixtures existentes sem bypass no runtime real; preservar catálogo/receitas e cron.
- Expected: suíte API inteira e PG16/17 passam; sem ligação externa em transação.
- Commit: feat: isolate audit jobs and delivery

## Task 5: Verificação e handoff
- Prisma validate/generate, typecheck, lint, build, unitários e E2E completos; revisão fresca da branch.
- Documentar gates operacionais, provisionamento sem segredos, limites e resultados medidos.
- Expected: evidências atuais; nenhuma alegação de produção.
- Commit: docs: record local read audit and tenant isolation verification

## Review Focus
Falhas de identidade, métodos novos sem classificação, fallback ao Prisma raiz, descoberta completa, locks de catálogo com referências de outro tenant, transações e efeitos externos, auth/job/definer como fronteiras de privilégio, resposta liberada em erro, papéis/ownership de objetos novos.
