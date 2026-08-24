---
version: 1
slug: "web-app-home-page-tsx"
primary_target: "web/app/home/page.tsx"
related_targets: []
---

# Home profissional

## Scope and mode

- Primary target: `web/app/home/page.tsx`
- Mode: Operate
- Scope: dashboard autenticado da primeira fase do redesign

## Audience and job

- Nutricionista, Personal Trainer ou Fisioterapeuta autenticado, uma atuação por conta.
- Entender o que exige atenção, localizar um cliente e iniciar uma ação pertinente à própria profissão.

## Primary action and content

- Ação primária: abrir ou cadastrar um cliente e avançar para o fluxo profissional permitido.
- Conteúdo: ações pertinentes à profissão, dados reais disponíveis, clientes recentes e estados vazios honestos.
- Agenda, métricas e alertas somente entram quando a API fornecer dados reais, autorizados e testáveis.

## Constraints

- Nunca misturar conteúdo de Nutrição, Treinamento e Fisioterapia no mesmo workspace.
- Preservar isolamento por proprietário e ocultar existência de recursos alheios.
- WCAG 2.2 AA, responsivo de celular a desktop.
- Nenhum dado clínico sensível em `localStorage`, logs ou mensagens desnecessárias.
- Testes Red, Green e Refactor; Cypress E2E real contra frontend, API e PostgreSQL.

## Chosen direction

- Visual world: SaaS Clínico Contemporâneo.
- Composition: Visão geral equilibrada.
- Approved comp: `.impeccable/mocks/dashboard-comp-01.png`.
- Memorable moment: a atuação e a base privada ficam evidentes antes do resumo, enquanto a primeira ação útil aparece sem depender de métricas decorativas.
- Carry forward: shell claro, acento azul-petróleo, hierarquia limpa, ações no topo, resumo e clientes recentes.
- Do not literalize: agenda, valores, nomes, contadores e dados demonstrativos do comp.

## Unresolved decisions

- Nenhuma decisão visual pendente para a especificação. A disponibilidade de cada bloco será determinada pela auditoria dos endpoints durante o plano de implementação.
