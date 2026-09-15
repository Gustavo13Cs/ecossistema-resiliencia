---
version: 1
slug: "web-app-agenda-page-tsx"
primary_target: "web/app/agenda/page.tsx"
related_targets:
  - "web/components/features/appointments"
---

# Agenda profissional

## Scope and mode

- Primary target: `web/app/agenda/page.tsx`
- Mode: Operate
- Scope: gestão privada de atendimentos do profissional individual

## Audience and job

- Nutricionista, Personal Trainer ou Fisioterapeuta autenticado, uma atuação por conta.
- Planejar o dia, a semana ou o mês; localizar um atendimento; confirmar sua situação; e acessar o prontuário autorizado sem trocar de contexto.

## Primary action and content

- Ação primária: agendar um atendimento associado a um `Client` ativo pertencente ao profissional.
- Conteúdo: calendário diário, semanal e mensal; filtros por cliente e estado; detalhes operacionais; ações de ciclo de vida; e histórico auditável.
- Feedback transitório não deve ocultar controles do painel nem substituir o estado persistido no histórico.

## Constraints

- Todo atendimento pertence ao profissional autenticado e referencia somente um `Client` ativo da mesma conta.
- Nunca revelar existência ou dados de clientes e atendimentos de outro profissional.
- Conflitos de horário retornam HTTP 409 e preservam os dados preenchidos para correção.
- Atualizações usam `expectedUpdatedAt`; mudanças de estado preservam eventos de auditoria.
- WCAG 2.2 AA, alvos de toque de no mínimo 44 px e layout responsivo de celular a desktop.
- Nenhum dado clínico sensível em `localStorage`, `sessionStorage`, logs ou mensagens públicas.

## Chosen direction

- Visual world: SaaS Clínico Contemporâneo existente no workspace SafeMove.
- Composition: toolbar operacional seguida pela visualização selecionada; detalhes em painel lateral no desktop e superfície integral no celular.
- Hierarquia: ação “Novo atendimento” no topo, período e filtros agrupados, compromissos escaneáveis e histórico no contexto do atendimento.
- Memorable moment: uma confirmação altera imediatamente o estado acessível do atendimento e acrescenta um evento permanente ao histórico.
- Carry forward: azul-petróleo, superfícies claras, bordas discretas, tipografia direta e densidade adequada ao trabalho diário.

## Unresolved decisions

- Integrações de lembrete externo, recorrência e disponibilidade configurável ficam para fases posteriores e exigem especificação própria.
