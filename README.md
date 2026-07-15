# 🏥 Ecossistema Resiliência

Uma plataforma multidisciplinar integrada para gestão centralizada de pacientes, conectando **Nutricionistas**, **Personais Trainers**, **Fisioterapeutas** e **Pacientes** em um único ecossistema. Atualmente em MVP (Produto Minimamente Viável), com foco em qualidade, segurança e experiência do usuário.

---

## 🎯 O Problema & A Solução

### O Cenário
Profissionais de saúde e bem-estar trabalham em silos. Um paciente que precisa de:
- **Nutrição** (dieta personalizada)
- **Treino** (musculação/cardio)
- **Reabilitação** (fisioterapia)

...acaba tendo 3 prontuários desconectados, sem comunicação entre especialistas.

### Nossa Abordagem
**Um único hub de dados** onde todos os profissionais veem o paciente de forma holística:
- Histórico completo em um único lugar
- Alertas automáticos para comportamentos anômalos (inatividade, platô, overtraining)
- Compartilhamento seguro de informações com permissões por role
- Compliance com boas práticas de saúde

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
| Frontend | Next.js | 16.2.7 | SSR + Geração estática; Excelente DX |
| Runtime | React | 19.1.0 | Novo compiler, melhor performance |
| Backend | NestJS | 11.0.1 | Arquitetura enterprise, modular, TypeScript first |
| ORM | Prisma | 7.5.0 | Type-safe, queries legíveis, migrations simples |
| Database | PostgreSQL | latest | Confiável, performance, suporta JSON |
| Auth | JWT + Passport | - | Stateless, seguro, standard na indústria |
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
│   │   ├── app.module.ts             # Módulo principal (imports)
│   │   ├── app.controller.ts         # Rota health check
│   │   ├── common/
│   │   │   ├── guards/               # JWT, Roles, Rate Limiting
│   │   │   ├── decorators/           # @Public, @Roles
│   │   │   └── exceptions/           # Exception filters customizados
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
│   │   │   └── metrics/              # Cálculos metabólicos
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
│   │   ├── paciente/                 # Rotas Paciente
│   │   └── membros/                  # Admin/Gestão
│   ├── components/
│   │   ├── Sidebar.tsx               # Navegação principal
│   │   ├── LayoutWrapper.tsx         # Wrapper com padding/responsive
│   │   ├── ui/                       # Componentes base (Button, Modal, etc)
│   │   └── features/                 # Componentes de negócio
│   ├── contexts/
│   │   └── auth-context.tsx          # Provedor de autenticação
│   ├── hooks/
│   │   ├── ui/                       # useToast, etc
│   │   └── features/                 # useCalculoEnergetico, useLabExams, etc
│   ├── lib/
│   │   ├── api.ts                    # Axios instance com interceptors
│   │   └── utils.ts                  # Helpers (cn, formatters)
│   ├── package.json
│   └── .env.local
│
├── .gitignore
├── README.md (este arquivo!)
└── docker-compose.yml (opcional)
```

---

## 🗄️ Modelo de Dados (Resumo)

### Usuários & Permissões
- **User**: Paciente ou Profissional (role-based)
  - PATIENT: Pode ver suas dietas, treinos, reabilitação
  - NUTRITIONIST: Cria dietas, vê pacientes, registra anamneses
  - PERSONAL: Cria planos de treino, alerta pacientes
  - PHYSIO: Cria planos de reabilitação, avaliações fisioterapêuticas
  - ADMIN: Gestão geral

- **ProfessionalPatientLink**: Conexão entre profissional e paciente (permite revogar acesso sem deletar dados)

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
- **DailyTracking**: Log de atividades completadas
- **PatientAlert**: Alertas automáticos (inatividade, platô, overtraining)

---

## 🚀 Como Instalar & Executar

### Pré-requisitos
- **Node.js** ≥ 18.x (recomendo 20.x)
- **npm** ou **yarn**
- **PostgreSQL** 14+ (local ou Docker)
- **Git**

### 1️⃣ Clone o Repositório

```bash
git clone https://github.com/Gustavo13Cs/ecossistema-resiliencia.git
cd ecossistema-resiliencia
```

### 2️⃣ Setup do Banco de Dados

#### Opção A: PostgreSQL Local
Se já tem PostgreSQL rodando localmente, crie um banco:
```bash
createdb ecossistema_resiliencia
```

#### Opção B: Docker (Recomendado)
```bash
docker run --name postgres-resiliencia \
  -e POSTGRES_DB=ecossistema_resiliencia \
  -e POSTGRES_PASSWORD=sua_senha \
  -p 5432:5432 \
  -d postgres:16
```

### 3️⃣ Setup do Backend (API)

```bash
cd api

# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais PostgreSQL e JWT_SECRET
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/ecossistema_resiliencia"
JWT_SECRET="sua_chave_super_secreta_aqui"
NODE_ENV="development"
EOF

# 3. Executar migrations
npx prisma migrate dev

# 4. (Opcional) Seed inicial de dados
npx prisma db seed

# 5. Iniciar em desenvolvimento
npm run start:dev
# Acessa em http://localhost:3000
```

### 4️⃣ Setup do Frontend (Web)

```bash
cd ../web

# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cat > .env.local << EOF
NEXT_PUBLIC_API_URL="http://localhost:3000"
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

### 🔐 Autenticação
- [x] Registro de usuários (Paciente, Profissional)
- [x] Login com JWT + Cookies
- [x] Proteção de rotas por role
- [x] Logout
- [ ] Recuperação de senha (planejado)
- [ ] 2FA (roadmap)

### 👥 Gestão de Pacientes
- [x] Perfil do paciente com anamnese
- [x] Ligação profissional-paciente (com permissões)
- [x] Histórico centralizado
- [x] Upload de dados antropométricos
- [ ] Documentos anexados (roadmap)

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
- JWT armazenado em **HttpOnly Cookies** (proteção contra XSS)
- Guards por role (RBAC)
- Rate limiting: 20 req/min por IP
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
npm run start        # Rodar build de produção
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

### Erro: "JWT Secret não configurado"
```bash
# Adicionar em api/.env
JWT_SECRET="gerem-uma-chave-segura"
# Pode usar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Erro: "CORS bloqueado"
```bash
# Certificar que NEXT_PUBLIC_API_URL está correto em web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3000"  # ou seu domínio
```

### Porta 3000/3001 já em uso
```bash
# Trocar porta no backend
cd api && npm run start:dev -- --port 3002

# Trocar porta no frontend (web/package.json)
"dev": "next dev -p 3002"
```

---

## 💬 Variáveis de Ambiente

### Backend (`api/.env`)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecossistema_resiliencia"

# JWT
JWT_SECRET="sua-chave-segura-aqui"

# Environment
NODE_ENV="development"

# (Futuro) Email, Twilio, etc
# SMTP_HOST=""
# SMTP_USER=""
# SMTP_PASS=""
```

### Frontend (`web/.env.local`)
```env
# API
NEXT_PUBLIC_API_URL="http://localhost:3000"

# (Futuro) Analytics, Auth0, etc
# NEXT_PUBLIC_SENTRY_DSN=""
```

---

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/minha-feature`
2. Commit com padrão: `git commit -m "feat: adicione minha feature"`
3. Push: `git push origin feature/minha-feature`
4. Abra um PR com descrição clara

**Code Style:**
- TypeScript strict
- Sem `any` types
- Componentes funcionais com hooks
- Nomeação clara (sem abbreviações)
- Testes unitários para lógica crítica

---

## 📄 Licença

MIT - Livre para usar em projetos pessoais e comerciais.

---

## 📞 Contato & Suporte

- **Criador:** Gustavo Cunha
- **GitHub:** [@Gustavo13Cs](https://github.com/Gustavo13Cs)
- **Issues & Sugestões:** [GitHub Issues](https://github.com/Gustavo13Cs/ecossistema-resiliencia/issues)

---

## ⭐ Créditos

Agradecimentos especiais às comunidades open-source de:
- **NestJS** - Excelente arquitetura backend
- **Next.js & React** - Frontend moderno
- **Prisma** - ORM type-safe
- **Tailwind CSS & Radix UI** - Design system elegante

---

**Última atualização:** Julho 2026  
**Status:** MVP em desenvolvimento ativo 🚀
