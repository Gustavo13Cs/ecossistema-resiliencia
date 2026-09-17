# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **Tarefa**: Nenhuma no momento (Relatórios & Métricas de Gestão concluído)
- **Status**: Concluída
- **Início**: 2026-09-17

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-09-17 | Implementação do módulo Relatórios & Métricas de Gestão para Nutricionistas (`/relatorios`): indicadores de retenção/evasão (churn), taxa de adesão a planos alimentares e hábitos, volume de atendimentos e produtividade da agenda, crescimento da base privada e exportação executiva em CSV e impressão/PDF | `Metas-Clínicas-&-Hábitos` |
| 2026-09-16 | Resolução de conflitos de merge com `origin/main` nos status files (`docs/agents/ANTIGRAVITY_STATUS.md` e `docs/agents/CODEX_STATUS.md`) | `Metas-Clínicas-&-Hábitos` |
| 2026-09-16 | Implementação e aprimoramento da Central de Exames Laboratoriais (`/exames`): visão 100% aberta na tela com todos os biomarcadores categorizados e visíveis sem cortes, alternador Aberto/Cards, gaveta ampla (sm:max-w-5xl/6xl), comparativo longitudinal SBPC/ML e emissão de pedidos padronizados | `main` |
| 2026-09-16 | Correção e aprimoramento da Gestão de Retornos: divisão da busca em janelas de 35 dias para respeitar limite da API (MAX_RANGE_MS 42d), sincronização com Agenda (`queryKeys.appointmentsRoot`), detecção de consultas para Hoje e preenchimento de cliente | `main` |
| 2026-09-16 | Implementação do módulo Gestão de Retornos (monitoramento de ciclos, fila de horizontes 7/15/30 dias, alertas de atraso/evasão, disparo rápido de mensagens de agendamento via WhatsApp, análise de cadência clínica e integração bidirecional com a Agenda) | `main` |
| 2026-09-16 | Implementação do módulo Metas Clínicas & Hábitos (metas de composição corporal com prazos estimados, adesão a hábitos de água/sono/refeições/passos, painel de atingimento da base de clientes e alertas clínicos proativos com ação WhatsApp) | `main` |
| 2026-09-15 | Implementação do módulo de Modelos de Planos Alimentares (templates pré-configurados SafeMove, auto-scaling de porções e macros, versionamento, arquivamento e importação para prontuário) | `main` |
| 2026-09-08 | Corrigir 500/429 em `/clients`: throttler 20→60, Dockerfile com migrate deploy, backfill de dados legados | `codex/fix-production-client-data` |

---

## Blocked

_Nenhum impedimento._

---

## Notes

- Migration `20260908194000_backfill_legacy_clients` copia dados de `professional_patient_links` + `User` para `clients`
- O Dockerfile agora roda `prisma migrate deploy` antes de iniciar o servidor
- Consultar `AGENTS.md` na raiz para orientação geral
- Consultar `docs/TASKS.md` para o backlog de tarefas
