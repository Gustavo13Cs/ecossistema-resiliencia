# Architecture Decision Records (ADRs)

> Decisões arquiteturais do SafeMove. Cada ADR documenta o contexto, a decisão e as
> consequências para que agentes e desenvolvedores entendam o "porquê" por trás de
> cada escolha.

---

## ADR-001: Professional-First — Client sem Login

**Status**: Aceita  
**Data**: 2026-06

### Contexto
A versão original tratava pacientes como usuários autenticáveis (`User` com role
`PATIENT`), misturando identidade de login com prontuário clínico. Isso criava
dependência da ação do paciente para o profissional trabalhar.

### Decisão
Separar `Client` (prontuário sem login) de `User` (identidade autenticável). O
profissional é o único a criar, editar e consultar prontuários na sua base privada.

### Consequências
- ✅ Profissional trabalha sem depender do paciente
- ✅ Modelo de ownership simples: `Client.professionalId = User.id`
- ⚠️ Legados temporários (`PATIENT` role, `ProfessionalPatientLink`, `/membros`,
  `/paciente`) permanecem até migração completa
- ⚠️ Fluxos antigos vinculados a `User` (dietas, treinos) precisam ser migrados
  para usar `Client`

---

## ADR-002: Prisma + PostgreSQL (Isolamento na Camada de App)

**Status**: Aceita  
**Data**: 2026-06

### Contexto
PostgreSQL suporta Row Level Security (RLS), mas adiciona complexidade operacional
com Prisma (que não tem suporte nativo a RLS via `SET LOCAL`).

### Decisão
Usar Prisma ORM com isolamento na camada de aplicação: todo query que toca dados
de `Client` filtra por `professionalId` derivado do JWT. RLS permanece como opção
futura ("RLS ready" no README).

### Consequências
- ✅ Setup simples, sem configuração extra no banco
- ✅ Prisma funciona sem workarounds
- ⚠️ Todo novo endpoint DEVE incluir filtro de `professionalId` — o guard
  `ClientAccessGuard` valida ownership
- ⚠️ Erro de implementação no filtro = vazamento de dados

---

## ADR-003: Tailwind CSS 4 + Radix UI como Design System Base

**Status**: Aceita  
**Data**: 2026-07

### Contexto
O projeto precisa de componentes acessíveis (WCAG 2.2 AA) sem opinião visual
forte, para permitir redesign completo.

### Decisão
- **Tailwind CSS 4** para styling utility-first com CSS variables para tokens
- **Radix UI** como base headless para comportamento acessível
- **shadcn/ui patterns** para composição (57 componentes em `components/ui/`)
- Referências visuais: Linear, Stripe Dashboard, Cliniko — para qualidade,
  não para copiar identidade

### Consequências
- ✅ Componentes acessíveis out-of-the-box (teclado, foco, ARIA)
- ✅ Total controle visual sem estar preso a um design system opinado
- ✅ Tailwind 4 com CSS layers para melhor cascade control
- ⚠️ Requer disciplina para não misturar inline styles com Tailwind

---

## ADR-004: TanStack Query para Estado de Servidor

**Status**: Aceita  
**Data**: 2026-07

### Contexto
O frontend precisa de gerenciamento de estado para dados vindo da API, com cache,
revalidação e estados de loading/error.

### Decisão
Usar TanStack Query (React Query) para toda comunicação com a API. Context API
usado apenas para estado de autenticação (escopo limitado e estável).

### Consequências
- ✅ Cache automático com invalidação controlada via `query-keys.ts`
- ✅ Hooks padronizados em `hooks/features/` para cada domínio
- ✅ Separação clara: TanStack Query = servidor, Context = auth local
- ⚠️ Não usar Context API para dados de servidor — sempre TanStack Query

---

## ADR-005: JWT em HttpOnly Cookies

**Status**: Aceita  
**Data**: 2026-06

### Contexto
Tokens JWT podem ser armazenados em localStorage, sessionStorage ou cookies.
Dados clínicos exigem proteção contra XSS.

### Decisão
JWT armazenado em cookies `HttpOnly` + `Secure` + `SameSite`. O frontend nunca
acessa o token diretamente — o browser envia automaticamente.

### Consequências
- ✅ Proteção contra XSS (JavaScript não acessa o cookie)
- ✅ Envio automático pelo browser em cada request
- ⚠️ Requer configuração de CORS + `credentials: 'include'`
- ⚠️ CSRF mitigation via `SameSite` (não usa tokens anti-CSRF explícitos por ora)

---

## ADR-006: Monorepo Simples (sem Turborepo/Nx)

**Status**: Aceita  
**Data**: 2026-06

### Contexto
O projeto tem 2 pacotes (`api/` e `web/`) com dependências independentes. Ferramentas
como Turborepo/Nx adicionam complexidade de configuração.

### Decisão
Manter `api/` e `web/` como diretórios independentes com seus próprios `package.json`
e `node_modules`. Sem workspace root `package.json`. CI roda jobs separados.

### Consequências
- ✅ Setup simples, sem tooling extra
- ✅ Cada pasta é self-contained — agentes podem trabalhar isoladamente
- ⚠️ Sem shared types entre API e frontend (duplicação manual)
- ⚠️ Sem task orchestration (cada dir roda seus próprios scripts)

---

## ADR-007: Multi-Agent Architecture (Worktrees + Status Tracking)

**Status**: Aceita  
**Data**: 2026-09

### Contexto
O projeto é mantido por múltiplos agentes de IA (Codex, Antigravity) que precisam
trabalhar em paralelo sem conflitos de merge ou edições concorrentes em arquivos
críticos.

### Decisão
- `AGENTS.md` na raiz como ponto de entrada para qualquer agente
- `docs/agents/` com status files por agente
- `.worktrees/` com worktrees Git para trabalho paralelo em domínios separados
- Arquivos protegidos (schema, migrations, env) requerem revisão humana
- Branches nomeadas por agente (`agent/<nome>/<feature>`)

### Consequências
- ✅ Agentes podem consultar o status uns dos outros
- ✅ Worktrees permitem edições paralelas sem conflitos de branch
- ✅ Documentação centralizada reduz "alucinações" sobre o estado do projeto
- ⚠️ Requer que cada agente atualize seu status file
