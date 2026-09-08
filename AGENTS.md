# AGENTS.md — Guia para Agentes de IA

> Este arquivo orienta qualquer agente de IA (Codex, Antigravity, Copilot, etc.) que
> abra este repositório. Leia-o antes de fazer qualquer alteração.

---

## 1. Visão Geral do Projeto

**SafeMove** é um SaaS profissional-first para Nutricionistas, Personal Trainers e
Fisioterapeutas. Cada profissional administra uma base privada de prontuários `Client`,
com isolamento completo entre contas.

| Camada    | Stack                                         |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| UI        | Radix UI (headless) + shadcn/ui patterns       |
| Estado    | TanStack Query (servidor) + Context API (auth) |
| Backend   | NestJS 11 + TypeScript + class-validator       |
| ORM       | Prisma 7.5                                     |
| Database  | PostgreSQL 16                                  |
| Auth      | JWT em HttpOnly cookies + Passport             |

---

## 2. Estrutura do Repositório

```
ecossistema-resiliencia/
├── api/                    # Backend NestJS
│   ├── src/
│   │   ├── common/         # Guards, decorators, strategies, types
│   │   ├── infra/          # Database (Prisma service)
│   │   └── modules/        # Módulos de domínio (auth, clients, workouts, etc.)
│   ├── prisma/
│   │   ├── schema.prisma   # Schema do banco (fonte da verdade)
│   │   └── migrations/     # Migrations versionadas
│   └── test/               # Testes e2e da API
│
├── web/                    # Frontend Next.js
│   ├── app/                # App Router (routes e pages)
│   ├── components/
│   │   ├── ui/             # Componentes base (57 primitivos Radix/shadcn)
│   │   ├── features/       # Componentes de negócio (agenda, clients, diet)
│   │   ├── dashboard/      # Componentes do dashboard
│   │   └── providers/      # Providers de contexto
│   ├── hooks/
│   │   ├── core/           # Hooks de infraestrutura (profile, dashboard)
│   │   └── features/       # Hooks de domínio (clients, agenda, fisio, etc.)
│   ├── contexts/           # Auth context
│   ├── lib/                # API client, query keys, utils
│   ├── types/              # TypeScript types compartilhados
│   ├── cypress/            # Testes E2E do frontend
│   └── styles/             # Estilos globais
│
├── docs/                   # Documentação
│   ├── ARCHITECTURE.md     # Arquitetura detalhada
│   ├── DECISIONS.md        # ADRs (Architecture Decision Records)
│   ├── SECURITY.md         # Modelo de segurança
│   ├── TASKS.md            # Backlog de tarefas
│   └── agents/             # Status por agente
│       ├── CODEX_STATUS.md
│       └── ANTIGRAVITY_STATUS.md
│
├── .worktrees/             # Git worktrees para trabalho paralelo
│   ├── frontend/           # Worktree para tarefas de frontend
│   ├── security/           # Worktree para tarefas de segurança
│   └── tests/              # Worktree para tarefas de testes
│
├── AGENTS.md               # ← ESTE ARQUIVO
├── PRODUCT.md              # Spec de produto (Impeccable)
├── README.md               # Documentação pública do projeto
├── docker-compose.yml      # Dev: API + Web + DB
├── docker-compose.test.yml # Testes: DB isolado na porta 5434
├── Dockerfile              # Build da API
└── .gitignore
```

---

## 3. Onde Encontrar Documentação

| Documento                  | O que contém                                  |
|---------------------------|-----------------------------------------------|
| `PRODUCT.md`              | Spec de produto, princípios, personas          |
| `docs/ARCHITECTURE.md`    | Camadas, módulos, fluxos, convenções            |
| `docs/DECISIONS.md`       | ADRs — por que decisões foram tomadas           |
| `docs/SECURITY.md`        | Auth, ownership, rate limiting, validação       |
| `docs/TASKS.md`           | Backlog de tarefas por fase                     |
| `README.md`               | Setup, stack, modelo de dados, troubleshooting  |

---

## 4. Convenções de Código

### Linguagem
- **Código**: inglês (nomes de variáveis, funções, classes, enums, tabelas)
- **Documentação**: português (docs, comments de contexto, PRODUCT.md)
- **Commits**: inglês, formato convencional (`feat:`, `fix:`, `refactor:`, `docs:`)

### TypeScript
- `strict: true` — sem `any` types exceto em casos documentados
- Componentes funcionais com hooks
- Nomeação clara, sem abreviações

### API (NestJS)
- Um módulo por domínio em `api/src/modules/`
- Cada módulo tem: `*.module.ts`, `*.controller.ts`, `*.service.ts`, DTOs
- Guards de autenticação (`JwtAuthGuard`) e acesso (`ClientAccessGuard`)
- Validação com `class-validator` + `class-transformer`

### Frontend (Next.js)
- App Router — cada rota em `web/app/`
- Hooks de dados em `web/hooks/features/` (TanStack Query)
- Componentes UI em `web/components/ui/` (primitivos)
- Componentes de negócio em `web/components/features/`

---

## 5. Regras de Segurança para Agentes

> [!CAUTION]
> Estas regras são invioláveis. Quebrá-las pode comprometer dados clínicos reais.

1. **NUNCA** commite ou exponha arquivos `.env`, `.env.local`, segredos ou chaves
2. **NUNCA** desabilite guards de autenticação ou autorização sem revisão humana
3. **NUNCA** exponha dados clínicos em logs, erros ou respostas públicas
4. **NUNCA** crie endpoints sem `JwtAuthGuard` (exceto rotas marcadas `@Public()`)
5. **NUNCA** retorne dados de um profissional para outro — todo acesso a `Client` filtra por `professionalId`
6. **NUNCA** persista dados clínicos sensíveis no localStorage ou sessionStorage

---

## 6. Como Rodar o Projeto

### Opção A: Docker (recomendado)
```bash
docker compose up --build -d
# API: http://localhost:3000
# Web: http://localhost:3001
```

### Opção B: Local
```bash
# Terminal 1 — API
cd api && npm install && npx prisma migrate dev && npm run start:dev

# Terminal 2 — Web
cd web && npm install && npm run dev
```

### Testes
```bash
# API — unitários
cd api && npm test

# API — e2e (precisa do banco de teste)
docker compose -f docker-compose.test.yml up -d
cd api && npm run test:e2e

# Web — Cypress
cd web && npm run build && npx cypress run
```

---

## 7. Coordenação Entre Agentes

### Status Tracking
Cada agente **DEVE** atualizar seu arquivo de status em `docs/agents/` antes de
iniciar e ao concluir trabalho:
- `docs/agents/CODEX_STATUS.md` — para o agente Codex
- `docs/agents/ANTIGRAVITY_STATUS.md` — para o agente Antigravity

### Worktrees
Use `.worktrees/` para trabalho paralelo sem conflitos de merge:
- `frontend/` — mudanças em `web/`
- `security/` — mudanças em guards, auth, validação
- `tests/` — novos testes ou refatoração de testes existentes

### Evitando Conflitos
1. **Antes de editar**: verifique os status files dos outros agentes
2. **Não edite simultaneamente**: `prisma/schema.prisma`, `app.module.ts`, `package.json`
3. **Use branches nomeadas**: `agent/codex/feature-name`, `agent/antigravity/feature-name`
4. **Documente em TASKS.md**: marque tarefas como "em andamento" com o nome do agente

---

## 8. Arquivos Protegidos (Revisão Humana Obrigatória)

Estes arquivos **NÃO devem ser alterados sem aprovação do mantenedor**:

| Arquivo                         | Motivo                                       |
|---------------------------------|----------------------------------------------|
| `api/prisma/schema.prisma`      | Mudanças de schema afetam o banco de produção |
| `api/prisma/migrations/`        | Migrations são irreversíveis em prod          |
| `api/.env` / `web/.env.local`   | Contêm credenciais                            |
| `.github/workflows/ci.yml`      | Pipeline de CI                                |
| `docker-compose.yml`            | Configuração de deploy                        |
| `PRODUCT.md`                    | Spec de produto validada pelo stakeholder     |

---

## 9. Módulos da API (Referência Rápida)

| Módulo               | Domínio                          | Status       |
|----------------------|----------------------------------|--------------|
| `auth`               | Login, registro, JWT             | ✅ Completo  |
| `users`              | Gestão de perfis profissionais   | ✅ Completo  |
| `clients`            | CRUD de prontuários Client       | ✅ Completo  |
| `workouts`           | Planos de treino + splits        | ✅ Funcional |
| `diet-plans`         | Prescrições nutricionais         | ✅ Funcional |
| `foods`              | Banco de alimentos               | ✅ Funcional |
| `assessments`        | Avaliações físicas               | ✅ Funcional |
| `physio-assessments` | Avaliações fisioterapêuticas     | ✅ Funcional |
| `rehab-plans`        | Planos de reabilitação           | ✅ Funcional |
| `anamneses`          | Fichas de anamnese               | ✅ Funcional |
| `supplements`        | Suplementação                    | ✅ Funcional |
| `lab-exams`          | Exames laboratoriais             | ✅ Funcional |
| `alerts`             | Sistema de alertas automáticos   | ✅ Funcional |
| `metrics`            | Cálculos metabólicos             | ✅ Funcional |
| `agenda`             | Agenda diária / tasks            | ✅ Funcional |
| `consultation-notes` | Notas de consulta                | ✅ Funcional |
| `consents`           | Consentimentos de paciente       | ✅ Funcional |

---

## 10. Diretrizes de Validação Visual

Não gere screenshots ou gravações durante cada etapa da implementação.

Priorize:
- implementação;
- typecheck;
- lint;
- testes;
- build;
- Cypress;
- análise do DOM quando suficiente.

Use inspeção visual no navegador somente quando necessária para validar layout, responsividade ou um problema visual.

Capture evidência visual apenas:
1. ao concluir uma página/feature;
2. quando encontrar um bug visual;
3. na validação final da tarefa.

Evite gerar múltiplas screenshots equivalentes.
