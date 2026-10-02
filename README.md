# 🏥 Ecossistema Resiliência

LINK - https://ecossistema-resiliencia.vercel.app/

O SafeMove é uma ferramenta profissional-first para Nutricionistas, Personal Trainers e Fisioterapeutas. Na Fase 1, cada conta profissional possui uma base privada de prontuários `Client`; fluxos legados de paciente permanecem temporariamente apenas para compatibilidade durante a migração.

---

## 🎯 O Problema & A Solução

### O Cenário
Profissionais de saúde e bem-estar precisam administrar clientes, dados clínicos e prescrições sem depender de uma conta ou ação do paciente. A base anterior misturava identidade autenticável e prontuário, o que dificultava a propriedade dos dados e a evolução do produto.

### Nossa Abordagem
Na Fase 1, cada conta escolhe uma única atuação profissional e administra somente sua própria base de `Client`. Cadastro profissional, CRUD, arquivamento e isolamento por proprietário formam a fundação concluída. Planos versionados, novos modelos reutilizáveis, PDF/impressão/compartilhamento por WhatsApp ou e-mail e a retirada completa dos fluxos de paciente permanecem em fases futuras.

---

## 📊 Stack & Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                       WEB (Frontend)                     │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS     │
│  Componentes: Radix UI | Forms: React Hook Form + Zod  │
│  Gráficos: Recharts | Estado: Context API              │
└────────────────────┬────────────────────────────────────┘
                     │
       ┌─────────────┴──────────────┐
       │  HTTP REST API             │
       │  JWT + Cookie-based Auth   │
       └─────────────┬──────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│              API (Backend) - NestJS                      │
│  - Arquitetura modular (Auth, Users, Diets, Workouts)  │
│  - Rate Limiting + Guards de autenticação               │
│  - Task Scheduling (alertas automáticos)                │
│  - Validação com class-validator + class-transformer    │
└────────────────────┬────────────────────────────────────┘
                     │
       ┌─────────────┴──────────────┐
       │  Prisma ORM               │
       └─────────────┬──────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│            Database - PostgreSQL                         │
│  - RLS (Row Level Security) ready                        │
│  - Schema relacional bem normalizado                     │
│  - Indexes otimizados para queries críticas              │
└─────────────────────────────────────────────────────────┘
```

### Tecnologias Principais

| Camada | Tecnologia | Versão | Por quê? |
|--------|-----------|--------|---------|
| Frontend | Next.js | 16.3.8 | SSR + Geração estática; Excelente DX |
| Runtime | React | 19.1.0 | Novo compiler, melhor performance |
| Backend | NestJS | 11.2.7 | Arquitetura enterprise, modular, TypeScript first |
| ORM | Prisma | 7.10.0 | Type-safe, queries legíveis, migrations simples |
| Database | PostgreSQL | 16 | Confiável, performance, suporta JSON |
| Auth | JWT + Passport | - | Access JWT curto e sessões revogáveis no servidor |
| Styling | Tailwind CSS | 4.1.9 | Utility-first, temas customizáveis |
| UI Components | Radix UI | latest | Headless, acessível, sem styles opinados |
| Forms | React Hook Form + Zod | latest | Validação forte, performance |
| Gráficos | Recharts | 2.15.4 | Componentes prontos, legends, tooltips |

---

## 🗂️ Estrutura do Projeto

```
ecossistema-resiliencia/
│
├── api/                              # Backend NestJS
│   ├── src/
│   │   ├── main.ts                   # Bootstrap, CORS e validação global
│   │   ├── app.module.ts             # Módulo raiz da API
│   │   ├── common/
│   │   │   ├── decorators/           # Rotas públicas e papéis
│   │   │   ├── guards/               # Autenticação e autorização
│   │   │   ├── client-access/         # Acesso ao prontuário Client
│   │   │   ├── patient-access/        # Compatibilidade com fluxos legados
│   │   │   ├── policies/              # Regras de domínio profissional
│   │   │   ├── security/              # Proteções compartilhadas
│   │   │   ├── strategies/            # Estratégias Passport/JWT
│   │   │   └── types/                 # Tipos compartilhados da API
│   │   ├── infra/
│   │   │   └── database/
│   │   │       ├── prisma.service.ts # PrismaClient singleton
│   │   │       └── database.module.ts # Módulo Global
│   │   ├── modules/
│   │   │   ├── auth/                 # Login, Register, JWT
│   │   │   ├── users/                # Gestão de perfis
│   │   │   ├── diet-plans/           # Prescrições nutricionais
│   │   │   ├── foods/                # Banco de alimentos
│   │   │   ├── workouts/             # Planos de treino
│   │   │   ├── assessments/          # Avaliações físicas
│   │   │   ├── physio-assessments/   # Avaliações fisioterapêuticas
│   │   │   ├── rehab-plans/          # Planos de reabilitação
│   │   │   ├── supplements/          # Suplementação
│   │   │   ├── lab-exams/            # Exames laboratoriais
│   │   │   ├── alerts/               # Sistema de alertas
│   │   │   ├── anamneses/            # Fichas de anamnese
│   │   │   ├── clients/              # Prontuários privados por profissional
│   │   │   ├── appointments/         # Agenda profissional
│   │   │   ├── client-goals/         # Metas e hábitos persistidos
│   │   │   └── lab-orders/           # Pedidos laboratoriais
│   │   └── ...
│   ├── prisma/
│   │   ├── schema.prisma             # Definição do banco
│   │   └── migrations/               # Histórico de mudanças DB
│   ├── package.json
│   └── .env.example
│
├── web/                              # Frontend Next.js
│   ├── app/
│   │   ├── layout.tsx                # Root layout com Auth Provider
│   │   ├── globals.css               # Tailwind imports
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dietas/                   # Rotas Nutricionista
│   │   ├── treinos/                  # Rotas Personal Trainer
│   │   ├── reabilitacao/             # Rotas Fisioterapeuta
│   │   ├── clientes/                 # Prontuários e prescrições por Client
│   │   └── agenda/                   # Agenda profissional
│   ├── components/
│   │   ├── auth/                      # Limites e proteção de rotas
│   │   ├── dashboard/                 # Painéis profissionais
│   │   ├── design/                    # Contratos e direção visual
│   │   ├── features/                  # Componentes por domínio
│   │   │   ├── agenda/                # Agenda e progresso
│   │   │   ├── appointments/           # Calendários e atendimentos
│   │   │   ├── clients/                # Diretório e prontuários
│   │   │   ├── dashboard/              # Resumo profissional
│   │   │   ├── diet/                   # Planos e modelos alimentares
│   │   │   ├── evolution/              # Evolução do cliente
│   │   │   ├── follow-ups/             # Retornos e acompanhamento
│   │   │   ├── goals/                  # Metas e alertas
│   │   │   ├── lab-exams/              # Exames e marcadores
│   │   │   ├── management/             # Indicadores da carteira
│   │   │   ├── placeholder/            # Estados de funcionalidades futuras
│   │   │   └── recipes/                # Receitas e versões
│   │   ├── feedback/                  # Estados de carregamento e erro
│   │   ├── layout/                    # Estrutura, sidebar e navegação
│   │   ├── marketing/                 # Apresentação das áreas profissionais
│   │   ├── providers/                 # Providers globais
│   │   └── ui/                        # Primitivos de interface reutilizáveis
│   ├── contexts/                      # Contexto de autenticação
│   ├── hooks/
│   │   ├── core/                      # Hooks de perfil e infraestrutura
│   │   ├── features/                  # Hooks por domínio/funcionalidade
│   │   └── ui/                        # Hooks de interface
│   ├── lib/                           # API, cache, regras e utilitários
│   ├── types/                         # Tipos de domínio do frontend
│   ├── styles/                        # Estilos globais
│   ├── public/                        # Logos, ícones e arquivos estáticos
│   ├── scripts/                       # Verificações e utilitários
│   ├── test/                          # Setup dos testes unitários
│   ├── cypress/
│   │   ├── e2e/                       # Fluxos automatizados no navegador
│   │   ├── fixtures/                  # Dados de apoio aos testes
│   │   └── support/                   # Comandos e configuração E2E
│   ├── .env.example                   # Modelo de configuração local
│   └── package.json                   # Scripts e dependências da web
├── docs/
│   ├── agents/                        # Registros de trabalho dos agentes
│   ├── app/guides/                    # Guias da aplicação
│   ├── assets/readme/                 # Capturas usadas neste README
│   ├── runbooks/                      # Procedimentos operacionais
│   ├── superpowers/
│   │   ├── plans/                     # Planos de implementação
│   │   └── specs/                     # Especificações de funcionalidades
│   ├── ARCHITECTURE.md
│   ├── database-baseline.md
│   ├── DECISIONS.md
│   ├── SECURITY.md
│   └── TASKS.md
├── .github/workflows/                 # CI
├── scripts/                           # Scripts operacionais da raiz
├── docker-compose.yml                 # Serviços locais da API e web
├── docker-compose.test.yml            # PostgreSQL isolado para testes
├── Dockerfile                         # Imagem de produção da API
├── AGENTS.md                          # Orientações para agentes
└── PRODUCT.md                         # Visão, usuários e princípios do produto
```

---

## 🗄️ Modelo de Dados (Resumo)

### Identidade profissional & Prontuários
- **User**: identidade autenticável. Novos cadastros públicos aceitam uma única atuação profissional: `NUTRITIONIST`, `PERSONAL` ou `PHYSIO`.
- **Client**: prontuário sem login, privado da conta profissional proprietária. A Fase 1 oferece cadastro, consulta, atualização, arquivamento e restauração.
- **Isolamento**: a API deriva o proprietário da autenticação e trata recursos de outra conta como não encontrados.
- **Histórico**: `PATIENT` e `ProfessionalPatientLink` permanecem no schema para preservar dados. Rotas de paciente e seus módulos de agenda, métricas e logs não estão montados no runtime.

### Nutrição
- **DietPlan**: Prescrição nutricional com macros (proteína, carbos, gordura, fibra)
- **Meal**: Refeição dentro do plano (café, almoço, lanche, jantar)
- **MealItem**: Alimento + quantidade dentro de uma refeição
- **Food**: Banco de alimentos com dados nutricionais

### Treino
- **Workout**: Plano geral (ex: "Fase de Adaptação" 4 semanas)
- **WorkoutSplit**: Fichas (Treino A, B, C)
- **WorkoutExercise**: Exercícios com séries, reps, rest

### Fisioterapia
- **PhysioAssessment**: Avaliação postural, testes ortopédicos, dor
- **RehabPlan**: Plano de reabilitação (ex: "Pós-LCA")
- **RehabSession**: Fases (analgésica, mobilidade, força)
- **RehabExercise**: Terapias e exercícios

### Monitoramento
- **PhysicalAssessment**: Antropometria (peso, BF, circunferências, dobras cutâneas)
- **LabExam + LabMarker**: Exames de sangue com marcadores (glicemia, colesterol, etc)
- **SupplementPlan + SupplementItem**: Receituário de suplementos
- **Anamnesis**: Ficha clínica (histórico, patologias, medicações, hábitos)
- **DailyTracking**: Atividades com ownership por profissional e Client
- **PatientAlert**: Snapshot transacional de alertas de treino para Clients ativos de PERSONAL; Patient permanece somente no histórico

---

## 🚀 Como Instalar & Executar

### Pré-requisitos
- **Node.js** 22.x (mesma versão das imagens Docker)
- **npm** ou **yarn**
- **PostgreSQL** 16 (local ou Docker)
- **Git**

- Node.js 22 ou compatível com Next.js 16 e NestJS 11
- npm
- PostgreSQL 16 acessível pela máquina
- Docker Compose, caso prefira executar a API e a web em containers

### Configurar as variáveis de ambiente

Na raiz do repositório, crie os arquivos locais a partir dos exemplos:

#### Opção B: imagens de runtime

O `docker-compose.runtime.yml` executa a API compilada, a web standalone e um job separado de migrations. Usa um banco externo configurado explicitamente e exige HTTPS terminado por proxy, pois os cookies de produção são Secure. Não monta fontes nem usa `env_file` das aplicações.

Depois de configurar `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` e `ALLOWED_ORIGINS` no ambiente do processo e revisar o banco de destino:

```powershell
docker compose -f docker-compose.runtime.yml config --quiet
docker compose -f docker-compose.runtime.yml up --build -d
```

A API e a web são publicadas apenas no loopback, nas portas 3000 e 3001. O job aplica migrations antes da API iniciar; não use esse comando contra produção sem a revisão operacional correspondente. O Compose antigo permanece histórico e é incompatível com as imagens que excluem Prisma CLI e ferramentas de desenvolvimento.

Para desenvolvimento HTTP local, use os passos abaixo. Para validar com dados sintéticos, siga o [runbook de remediação](docs/runbooks/security-remediation-verification.md), com PostgreSQL isolado na porta 5434. Para reconciliar um banco remoto com o baseline, consulte [database-baseline](docs/database-baseline.md).
### 3️⃣ Setup do Backend (API)

Em um terminal:

# 1. Instalar dependências
npm ci

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais PostgreSQL e JWT_SECRET
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/ecossistema_resiliencia"
DIRECT_URL="postgresql://user:password@localhost:5432/ecossistema_resiliencia"
JWT_SECRET="sua_chave_super_secreta_aqui"
NODE_ENV="development"
AUTH_COOKIE_SECURE="false"
AUTH_COOKIE_SAME_SITE="lax"
ALLOWED_ORIGINS="http://localhost:3001"
EOF

# 3. Aplicar migrations existentes apenas no banco local
npx prisma migrate deploy

# 4. (Opcional) Seed inicial de dados
npx prisma db seed

# 5. Iniciar em desenvolvimento
npm run start:dev
```

Em outro terminal:

```bash
cd ../web

# 1. Instalar dependências
npm ci --legacy-peer-deps

# 2. Configurar variáveis de ambiente
cat > .env.local << EOF
INTERNAL_API_URL="http://localhost:3000"
EOF

# 3. Iniciar em desenvolvimento
npm run dev
# Acessa em http://localhost:3001
```

### ✅ Verificar Instalação

- **API está rodando?**
  ```bash
  curl http://localhost:3000/ping
  # Response: "pong"
  ```

- **Banco de dados conectado?**
  Veja o log: `🟢 Banco de Dados Conectado com Sucesso!`

- **Web carregou?**
  Abra http://localhost:3001 no browser

---

## 📋 Funcionalidades Principais (MVP)

### 👩‍⚕️ Fundação profissional (Fase 1)
- [x] Cadastro público exclusivo de Nutricionista, Personal Trainer ou Fisioterapeuta, com uma atuação por conta
- [x] Base de prontuários `Client` privada por profissional
- [x] Cadastro, listagem, consulta e edição de clientes
- [x] Arquivamento e restauração de clientes, sem exclusão pela API
- [x] Isolamento entre contas profissionais, com recurso alheio tratado como não encontrado

### 🔄 Transição e fases seguintes
- [ ] Migrar dietas, treinos, reabilitações e avaliações para planos versionados vinculados a `Client`
- [ ] Implementar novos modelos reutilizáveis independentes e cópia profunda
- [ ] Gerar PDF e apoiar impressão ou compartilhamento manual por WhatsApp/e-mail
- [ ] Remover os fluxos legados de paciente somente após migração e verificação dos consumidores

### 🥗 Módulo Nutrição
- [x] Criação de planos dietéticos
- [x] Cálculo automático de macronutrientes (Mifflin, Harris, FAO)
- [x] Banco de alimentos com busca
- [x] Refeições customizáveis
- [x] Histórico de exames laboratoriais com gráficos
- [x] Suplementação prescrita
- [ ] Sincronização com app de rastreio (roadmap)

### 💪 Módulo Personal Trainer
- [x] Criação de planos de treino (splits, mesociclos)
- [x] Exercícios com séries, reps, rest
- [x] Dashboard de alertas (inatividade, plateau)
- [x] Acompanhamento de pacientes
- [ ] Video tutoriais dos exercícios (roadmap)

### 🏥 Módulo Fisioterapia
- [x] Avaliação fisioterapêutica (postural, testes ortopédicos)
- [x] Planos de reabilitação com fases
- [x] Exercícios terapêuticos
- [ ] Escalas de dor detalhadas (roadmap)

### 📊 Alertas & Monitoramento
- [x] Alertas automáticos para profissionais
  - Inatividade > 5 dias
  - Plateau em 3 semanas
  - Risco de overtraining
- [x] Dashboard "UTI" para profissionais
- [ ] Notificações push (roadmap)
- [ ] Relatórios automáticos (roadmap)

### 📈 Analytics (Phase 2)
- [ ] Dashboard executivo
- [ ] Exportação de relatórios (PDF, Excel)
- [ ] Métricas de progresso
- [ ] Comparações antes/depois

---

## 🔒 Segurança & Boas Práticas

### Autenticação & Autorização
- Access JWT de 15 minutos em cookie HttpOnly; sessões revogáveis e refresh rotativo com validade fixa de 30 dias
- Mutações por cookie exigem origem permitida e token CSRF; cookies Secure são obrigatórios em produção
- Impressões escapam HTML; scripts usam nonce CSP por requisição, sem scripts inline em produção
- Dados clínicos ficam na API e no cache em memória, sem localStorage/sessionStorage
- Guards por role (RBAC)
- Rate limiting: 60 req/min por IP; login 5/minuto
- Senhas hashadas com **bcrypt** (salt rounds: 12)

### Database
- Prepared statements via Prisma (proteção contra SQL Injection)
- Foreign keys com cascade delete
- Timestamps de auditoria (createdAt, updatedAt)
- Índices otimizados para queries críticas

### Código
- TypeScript strict mode
- Validação com `class-validator`
- Transformação com `class-transformer`
- Sem `any` types (exceto em casos pontuais documentados)

---

## 📝 Scripts Úteis

### Backend
```bash
cd api

# Desenvolvimento
npm run start:dev      # Modo watch com nodemon
npm run start:debug    # Com debugger
npm run start:prod     # Modo produção

# Testes
npm run test           # Rodar testes unitários
npm run test:watch    # Watch mode
npm run test:cov      # Com coverage
npm run test:e2e      # End-to-end

# Code Quality
npm run lint          # ESLint
npm run format        # Prettier

# Database
npx prisma studio    # UI visual do banco
npx prisma migrate dev --name add_feature  # Nova migration
```

### Frontend
```bash
cd web

npm run dev          # Desenvolvimento
npm run build        # Build para produção
node .next/standalone/server.js # Runtime de produção (copiar public e .next/static; definir PORT=3001)
npm run lint         # ESLint
```

---

## 🛣️ Roadmap (Em Discussão)

### Phase 2 (Q3-Q4 2026)
- [ ] Notificações por email/SMS (via Twilio/SendGrid)
- [ ] Integração com Google Calendar (agendamentos)
- [ ] Chat entre profissional e paciente
- [ ] Vídeos tutoriais de exercícios
- [ ] Relatórios em PDF/Excel automatizados

### Phase 3 (2027)
- [ ] App mobile (React Native)
- [ ] Wearable integration (Apple Health, Google Fit)
- [ ] IA para sugestões de treino/dieta
- [ ] Telemedicina (video consultas)
- [ ] Marketplace de profissionais

---

## 🐛 Troubleshooting

### Erro: "Banco não encontrado"
```bash
# Verificar URL do DATABASE_URL em .env
# Certificar que PostgreSQL está rodando
docker ps | grep postgres
# Ou
psql -U postgres -l  # Listar DBs
```

A web ficará disponível em `http://localhost:3001` e a API em
`http://localhost:3000`.

### Erro: "CORS bloqueado"
```bash
# Conferir INTERNAL_API_URL no build da web e ALLOWED_ORIGINS na API
INTERNAL_API_URL="http://localhost:3000"  # ou seu domínio
```

Depois de configurar `api/.env` e `web/.env.local`, execute na raiz:

```powershell
docker compose up --build
```

O Compose inicia a API e a web; **não cria um serviço PostgreSQL**. O banco deve
estar disponível separadamente e ser acessível de dentro dos containers. Se o
banco estiver na máquina host, use um hostname acessível a partir do Docker em
vez de `localhost` nas URLs configuradas para a API.

### Backend (`api/.env`)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecossistema_resiliencia"
DIRECT_URL="postgresql://user:password@localhost:5432/ecossistema_resiliencia"

# JWT
JWT_SECRET="sua-chave-segura-aqui"

# CORS e fuso horário
ALLOWED_ORIGINS="http://localhost:3001"
TZ="UTC"

# Environment
NODE_ENV="development"
AUTH_COOKIE_SECURE="false"
AUTH_COOKIE_SAME_SITE="lax"

# (Futuro) Email, Twilio, etc
# SMTP_HOST=""
# SMTP_USER=""
# SMTP_PASS=""
```

### Frontend (`web/.env.local`)
```env
# API
INTERNAL_API_URL="http://localhost:3000"

# Web: testes unitários, tipos e lint
cd ..\web
npm test
npm run typecheck
npm run lint
```

Os testes E2E da API e da web dependem de serviços configurados; para a base
PostgreSQL isolada dos testes, consulte `docker-compose.test.yml` e as
instruções dos projetos em `api/` e `web/`.

## Privacidade e segurança

O backend protege rotas por autenticação e valida autorização e propriedade do
prontuário no servidor. A sessão usa JWT em cookie HttpOnly; dados clínicos não
devem ser persistidos no armazenamento local do navegador. Ocultar uma ação na
interface não substitui a autorização na API.

Leia [`docs/SECURITY.md`](docs/SECURITY.md) antes de alterar autenticação,
autorização ou dados clínicos. O SafeMove não declara certificação regulatória
ou conformidade clínica a partir da implementação técnica descrita neste
repositório.

## Documentação

- [Visão do produto](PRODUCT.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Modelo de segurança](docs/SECURITY.md)
- [Tarefas e evolução](docs/TASKS.md)
- [Baseline e migrações do banco](docs/database-baseline.md)

## Contribuição

**Última atualização:** 2 de outubro de 2026
**Status:** MVP em desenvolvimento ativo. Sessões, isolamento por Client e remediação documentados em [SECURITY](docs/SECURITY.md) e no [runbook](docs/runbooks/security-remediation-verification.md).
