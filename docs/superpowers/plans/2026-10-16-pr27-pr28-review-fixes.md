# Correções das revisões PRs 27 e 28

**Objetivo:** corrigir os três achados confirmados do PR 27 e validar a API pendente no PR 28.
**Base:** e33f9c7, ambos PRs integrados. Branch `agent/codex/pr27-pr28-review-fixes`.
**Arquitetura:** manter o editor montado após recarga transitória e bloquear envio; separar mutation de avaliação do observador de leitura; reutilizar logout existente para reautenticação nas cinco telas.
**Stack:** Next.js, React, TanStack Query, Vitest, NestJS/Jest.
**Requisitos:** revisões privadas dos chats indicados pelo mantenedor; sem storage clínico persistente, alterações de schema/migrations ou publicação em produção.

## Tarefas

- [x] Reproduzir perda do formulário em `workout-client-contract.test.tsx`, com QueryClient real; corrigir `novo-treino/page.tsx` e `WorkoutEditor.tsx`; testar falha inicial, recarga, retry e negação de acesso.
- [x] Reproduzir erro do histórico durante POST pendente em `PersonalClientRecord.test.tsx`; extrair `useCreateClientAssessment` e usá-lo no diálogo sem observador desabilitado. Verificar novo GET e avaliação exibida após sucesso.
- [x] Testar recuperação com sessão presente; usar componente compartilhado de reautenticação com logout existente nas cinco telas afetadas. Verificar logout, limpeza do cache e rota `/auth/login`.
- [x] Executar suítes web/API, typecheck, lint e builds; registrar resultados.
- [ ] Publicar branch e abrir PR (autorização explícita recebida em 2026-10-17).

## Foco da revisão final

- Falha inicial bloqueia prescrição sem contexto verificado.
- Recarga 503/rede mantém campos, bloqueia envio e libera após retry bem-sucedido.
- 401/403 e mudança de conta/aluno removem conteúdo do contexto anterior.
- POST pendente não substitui leitura compartilhada por função desabilitada.
- Reautenticação limpa sessão/cache antes de abrir login.

## Retomada

Ambiente recriado em 2026-10-17. Patch restaurado do histórico desta conversa, sem reiniciar a análise. Revisão independente anterior não apontou defeitos acionáveis. Testes focados restaurados: 38/38 aprovados.
