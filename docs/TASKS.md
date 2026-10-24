# Backlog de Tarefas — SafeMove

> Backlog centralizado. Agentes devem consultar este arquivo antes de iniciar
> trabalho e marcar tarefas como "em andamento" com seu nome.
>
> **Legenda**: ✅ Concluído | 🔄 Em andamento | ⏳ Pendente | ❌ Bloqueado

---

## Personal P3 — concluído localmente em 24/10/2026

- ✅ **Codex**: PDF confrontado com o projeto; [especificação](superpowers/specs/2026-10-23-personal-p3-design.md) e [plano](superpowers/plans/2026-10-23-personal-p3.md) aprovados e executados. Consulta/impressão na ficha atual, conforme escolha do mantenedor.
- ✅ Monitor de volume semanal, frequência, sinergia, cobertura e snapshot do servidor implementados e revisados.
- ✅ Modelos globais/privados imutáveis, filtros, prévia, cópia sanitizada para rascunho e isolamento por conta implementados e revisados.
- ✅ Periodização opcional de 4–12 semanas, prévia antes de finalizar, progressão/deload e datas da semana na consulta/impressão implementados e revisados.
- ✅ API 755/755, web 748/748, PostgreSQL/HTTP/RLS 253/253; tipos, lint, builds e verificações de produção local aprovados. Nove verificações reais Chromium/Playwright, desktop/mobile e PDF A4 aprovados; rerevisão final sem achados materiais.
- ℹ️ Cenários Cypress versionados; runner nativo não executado porque o download do binário recebeu HTTP 403. Jornada real validada com Chromium/Playwright disponível, sem contornar a política de rede.
- ✅ [Relatório final e decisões](runbooks/personal-p3-verification.md). Branch `agent/codex/personal-p3` publicada, por solicitação posterior do mantenedor, no [PR #31](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/31). Migrations somente no PostgreSQL sintético; sem merge, deploy ou produção.

## Correções das revisões — 2026-10-17

- ✅ Codex: PR #27 — prescrição preservada em falhas transitórias, histórico após avaliação e reautenticação nas cinco telas corrigidos. PR #28 — suíte API pendente validada (602/602); web 525/525, tipos/lint/builds aprovados. Publicado no PR #29 (rascunho), após autorização do mantenedor em 2026-10-17.

## Fase 1 — Fundação Profissional ✅

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 1.1 | Cadastro público de profissional (NUTRITIONIST, PERSONAL, PHYSIO) | ✅ | — |
| 1.2 | Login com JWT em HttpOnly cookie | ✅ | — |
| 1.3 | CRUD de Client (prontuário sem login) | ✅ | — |
| 1.4 | Arquivamento e restauração de Client | ✅ | — |
| 1.5 | Isolamento por professionalId (ownership) | ✅ | — |
| 1.6 | ClientAccessGuard na API | ✅ | — |
| 1.7 | CI com testes unitários, e2e e Cypress | ✅ | — |

---

## Fase 2 — Design System & Migração (Em Andamento)

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 2.1 | Design system (tokens, cores, tipografia) | 🔄 | Codex |
| 2.2 | Navegação profissional no Sidebar (filtrar por role) | 🔄 | Codex |
| 2.3 | Dashboard por atuação profissional | 🔄 | Codex |
| 2.4 | Migrar dietas de User para Client | ✅ | Codex |
| 2.5 | Migrar treinos de User para Client | 🔄 | Codex |
| 2.6 | Migrar avaliações de User para Client | 🔄 | Codex |
| 2.7 | Migrar reabilitação de User para Client | 🔄 | Codex |
| 2.8 | Migrar anamnese de User para Client | 🔄 | Codex |
| 2.9 | Migrar suplementos de User para Client | 🔄 | Codex |
| 2.10 | Migrar exames lab de User para Client | 🔄 | Codex |
| 2.11 | Remover fluxos legados de paciente (ProfessionalPatientLink, /membros, /paciente) | 🔄 | Codex |
| 2.12 | Agenda profissional de atendimentos vinculada a Client | ✅ | Codex |

---

## Fase 3 — Planos Versionados & Outputs

Publicação em andamento, autorizada em 21/10/2026: integração com main validada (web666, browser32/32), seguida por PR/checks, três migrations e deploy dos serviços existentes. [Runbook da publicação](runbooks/personal-release-2026-10-21.md).

Entrega do Personal aprovada pelo usuário em 17/10/2026, com execução por subagentes: [direção](planning/2026-10-17-personal-proxima-entrega.md), [rascunhos/revisões](superpowers/plans/2026-10-17-personal-rascunhos-revisoes.md) e [biblioteca visual](superpowers/plans/2026-10-17-personal-biblioteca-visual.md). Ambos os planos concluídos e revisados. A biblioteca preserva 148 exercícios, inclui 20 com 21 ilustrações licenciadas e permite cadastro manual com link próprio opcional; fichas e rascunhos mantêm referências históricas autorizadas. A revisão ampla identificou um ajuste de foco, corrigido em `2d8d803` e aprovado na única rerevisão restrita, sem pendências. Gates finais: 657 testes web, tipos/lint/builds e visual real 4/4; API 737, PostgreSQL 243, 21 probes oficiais e 28/28 regressões reais retidos sem alterações nas fontes afetadas. O lote histórico 31/32 continua discriminado no [runbook](runbooks/personal-exercise-media-verification.md), sem ser apresentado como verde. Desktop/celular, teclado, impressão e isolamento por conta conferidos. Branch/worktree preservadas; sem publicação ou migrations em produção.

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 3.1 | Rascunhos e revisões de prescrição do Personal | ✅ | Codex |
| 3.2 | Modelos reutilizáveis com cópia profunda | ⏳ | — |
| 3.3 | Geração de PDF para prescrições | ⏳ | — |
| 3.4 | Impressão de planos | ⏳ | — |
| 3.5 | Compartilhamento por WhatsApp/e-mail | ⏳ | — |
| 3.6 | Banco versionado de receitas com macros, restrições e associação às refeições | ✅ | Codex |
| 3.7 | Biblioteca visual de exercícios e referências nas prescrições | ✅ | Codex |

---

## Fase 4 — Infraestrutura & Qualidade

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 4.1 | Shared types entre API e frontend | ⏳ | — |
| 4.2 | Testes unitários para todos os services da API | ⏳ | — |
| 4.3 | Testes Cypress para todos os fluxos profissionais | ⏳ | — |
| 4.4 | Seed de dados realistas para desenvolvimento | ⏳ | — |
| 4.5 | Documentação de API (Swagger/OpenAPI) | ⏳ | — |
| 4.6 | Monitoramento de performance (bundle size, query time) | ⏳ | — |
| 4.7 | Endurecer Data API, grants e RLS defensivo no Supabase | ✅ | Codex |
| 4.8 | Remediar os 15 achados da auditoria de segurança e qualidade | ✅ | Codex |
| 4.10 | Corrigir DR-001/002/003 e validar patch local; proposta de leitura/RLS preparada | ✅ local | Codex |
| 4.11 | Auditoria de leitura v3 implementada e verificada; produção pendente | ✅ local | Codex |
| 4.12 | RLS sem bypass provado em PG16/17; produção depende da Fase 0 | ✅ local | Codex |
| 4.13 | Atualizar dependências de desenvolvimento/testes e validar compatibilidade | ⏳ | — |
| 4.14 | Proteger scripts demo/seed e atestar role, backups/restauração e publicação | ⏳ | — |
| 4.16 | Recuperação Render concluída: backup restaurado, migration/LOGINs/CA em produção; PR#24 e deploy live; página própria confirmada pelo mantenedor | ✅ deploy | Codex |
| 4.15 | Consolidar proposta v3 com ajustes da revisão de leitura/RLS | ✅ documento | Codex |

---

## Roadmap Futuro

| # | Tarefa | Status |
|---|--------|--------|
| 5.1 | Notificações por email/SMS | ⏳ |
| 5.2 | Integração com Google Calendar | ⏳ |
| 5.3 | Chat profissional-paciente | ⏳ |
| 5.4 | App mobile (React Native) | ⏳ |
| 5.5 | Wearable integration (Apple Health, Google Fit) | ⏳ |
| 5.6 | IA para sugestões de treino/dieta | ⏳ |

---

## Como usar este arquivo

1. **Antes de iniciar**: verifique a coluna "Agente" — se outro agente está trabalhando, evite conflito
2. **Ao iniciar**: mude o status para 🔄 e coloque seu nome na coluna "Agente"
3. **Ao concluir**: mude o status para ✅
4. **Se bloqueado**: mude para ❌ e descreva o impedimento em `docs/agents/<SEU_STATUS>.md`

### Remediação de segurança — Codex
- ✅ Review final do PR #22 (Codex): cache do protocolo invalidado antes de navegar; criação/substituição com o mesmo QueryClient real em menos de 60 segundos, consulta ativa e erro cobertos. 9 testes focais, tipos/lint/build aprovados localmente; conferir checks após push.
- ✅ Correção do CI do PR #22 (Codex): gate standalone compatível com o artefato do Vercel, preservando os checks local/Docker; 44 testes, tipos/lint/build aprovados localmente. Conferir o deployment do novo HEAD após push.
- ✅ Review do PR #22 (Codex): índice legado sem reescrever histórico, refresh resiliente a 500 e invalidação da central de exames; [validação e limites](runbooks/pr22-review-corrections.md).
- [x] Plano A: ownership por Client, schema e retirada do runtime legado — concluído no worktree de segurança.
- [x] Plano B: persistência server-only, impressão escapada e CSP — concluído (Codex); jornada real e gate de HTML dinâmico aprovados.
- [x] Plano C: sessões revogáveis e dependências — concluído (Codex); 11 testes HTTP reais e jornada Cypress aprovados.
- [x] Plano D: operação, índices e gates de qualidade — concluído no worktree (Codex). Evidência e limites: [verificação final](runbooks/security-remediation-verification.md). Sem publicação ou migrations em produção.

## Remoção de Histórico de acessos — 2026-10-08

- [x] Codex: interface/API/coleta/entrega/modelos exclusivos retirados; RLS/guards/contexto e históricos de alterações preservados.
- [x] Primeira etapa revisada sem achados; PR #25 integrado em e1b13ddd com CI completo; Render live e Vercel produção READY.
- [x] Segunda etapa preparada e provada: owner gerenciado, preservação dos dados/RLS e rollback diante de dependência inesperada; 30 suítes/181 E2E PG17, TypeScript/lint aprovados.
- [x] Revisão sem achados e PR #26 pronto; rebase sobre main preservou o SQL/teste já revisados.
- [x] Produção autorizada: primeira etapa live; novo backup cifrado restaurou43 tabelas/21 acessos; migration18 aplicada externamente pelo owner. 18 concluídas/zero falhas,40 tabelas de domínio com RLS e contagens preservadas; objetos exclusivos ausentes.
- [ ] Publicar segunda etapa após CI completo e confirmar Render live/checker sem migrations pendentes e frontend em produção.

---

## Planejamento — Workspace do Personal

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| P.0 | Diagnóstico Obsidian/código e proposta de evolução de uso exclusivo do Personal | ✅ proposta documentada | Codex |
| P.1 | Workspace e prontuário do Personal integrados à avaliação, treino ativo e agenda ([verificação](runbooks/personal-p1-verification.md)) | ✅ concluído | Antigravity |
| P.2 | Contexto/anamnese de treinamento e avaliações completas | ⏳ proposta | — |
| P.3 | Editor profissional e biblioteca de exercícios | ⏳ proposta | — |
| P.4 | Versões, modelos independentes e documentos (entregas encadeadas) | ⏳ proposta | — |
| P.5 | Sessões, evolução e revisão periódica registradas pelo Personal | ⏳ proposta | — |
| P.6 | Periodização e gestão do acompanhamento | ⏳ proposta | — |

- [x] Codex — Rascunhos Task 2: escrita finalizada, metadados e preservação de histórico; 39 unitários e 13 regressões PostgreSQL, tipos/lint aprovados (2026-10-17).
