# Backlog de Tarefas — SafeMove

> Backlog centralizado. Agentes devem consultar este arquivo antes de iniciar
> trabalho e marcar tarefas como "em andamento" com seu nome.
>
> **Legenda**: ✅ Concluído | 🔄 Em andamento | ⏳ Pendente | ❌ Bloqueado

---

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
| 2.4 | Migrar dietas de User para Client | ⏳ | — |
| 2.5 | Migrar treinos de User para Client | ⏳ | — |
| 2.6 | Migrar avaliações de User para Client | ⏳ | — |
| 2.7 | Migrar reabilitação de User para Client | ⏳ | — |
| 2.8 | Migrar anamnese de User para Client | ⏳ | — |
| 2.9 | Migrar suplementos de User para Client | ⏳ | — |
| 2.10 | Migrar exames lab de User para Client | ⏳ | — |
| 2.11 | Remover fluxos legados de paciente (ProfessionalPatientLink, /membros, /paciente) | ⏳ | — |

---

## Fase 3 — Planos Versionados & Outputs

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 3.1 | Planos versionados (draft → published → archived) | ⏳ | — |
| 3.2 | Modelos reutilizáveis com cópia profunda | ⏳ | — |
| 3.3 | Geração de PDF para prescrições | ⏳ | — |
| 3.4 | Impressão de planos | ⏳ | — |
| 3.5 | Compartilhamento por WhatsApp/e-mail | ⏳ | — |

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
