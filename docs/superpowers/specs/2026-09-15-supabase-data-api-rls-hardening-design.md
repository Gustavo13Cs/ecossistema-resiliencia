# Design: Endurecimento da Data API e RLS Defensivo

- **Data:** 15 de setembro de 2026
- **Status:** aprovado pelo mantenedor para implementação
- **Produto:** SafeMove
- **Escopo:** reduzir a superfície pública do PostgreSQL hospedado no Supabase sem alterar o fluxo de autenticação NestJS/Prisma

## 1. Contexto verificado

O SafeMove usa autenticação própria no NestJS. O navegador envia um JWT em cookie
`HttpOnly` para a API, a API extrai `sub` e `role`, e os services aplicam autorização
e ownership antes de consultar o Prisma. O frontend não instancia um cliente Supabase
em código de aplicação e acessa dados por Axios contra a API NestJS.

A conexão de produção do Prisma usa o pooler do Supabase com o identificador
`postgres.<project-ref>`. A inspeção remota de 15 de setembro de 2026 confirmou que
essa conexão resolve para o papel PostgreSQL `postgres`, que possui `BYPASSRLS`.
Consequentemente, habilitar RLS nas tabelas não restringe as consultas feitas pela API
NestJS atual.

O mesmo diagnóstico remoto confirmou:

- `anon`, `authenticated` e `service_role` têm acesso efetivo a zero tabelas do
  schema `public`;
- não existem policies no schema `public`;
- `diet_plans` e `meal_items` estão com RLS habilitado e sem policy;
- as outras 32 tabelas públicas, incluindo `_prisma_migrations`, estão sem RLS;
- o Security Advisor reporta apenas as duas tabelas com RLS sem policy;
- o código atual continua sendo a fonte final da verdade; o grafo consultado foi
  construído em commit anterior e serviu apenas para localizar os pontos de integração.

Esse estado já impede o acesso normal das roles da Data API às tabelas. Entretanto,
o bloqueio precisa ser documentado e versionado para não depender de configuração
implícita ou de defaults que mudem no futuro.

## 2. Objetivo

Criar uma fronteira explícita de defesa para o banco de produção:

1. desabilitar a Data API porque o SafeMove não a utiliza;
2. manter tabelas, sequências e funções inacessíveis às roles da Data API por padrão;
3. habilitar RLS defensivo nas tabelas de aplicação com uma policy restritiva de
   bloqueio total;
4. preservar o funcionamento do NestJS/Prisma e a autorização por
   `professionalId` existente;
5. preparar o banco de receitas para nascer sob o mesmo padrão de exposição mínima.

## 3. Limite de segurança desta fase

Esta fase protege contra exposição acidental por PostgREST/GraphQL. Para `anon` e
`authenticated`, a policy restritiva também impede acesso caso um grant seja
restaurado por engano. `service_role` possui `BYPASSRLS` e depende da Data API
desabilitada e da revogação de grants; a policy não o restringe. Esta fase **não**
implementa isolamento RLS real entre profissionais nas consultas do Prisma.

O isolamento entre profissionais continua sendo garantido por:

- `JwtAuthGuard` e `RolesGuard`;
- `ClientAccessService` e guards de domínio;
- filtros de `professionalId` derivados de `req.user.sub`;
- testes negativos que tentam acessar recursos de outra conta.

Não serão criadas policies com `auth.uid()`: o SafeMove não usa Supabase Auth e seu
JWT não é propagado para a sessão PostgreSQL. Também não será usado
`SECURITY DEFINER` para contornar permissões.

## 4. Abordagem aprovada

### 4.1 Data API desabilitada

A integração Data API do projeto será desabilitada no painel do Supabase. Isso fecha
os endpoints REST e GraphQL gerados automaticamente, independentemente de grants e
policies.

Storage, conexão PostgreSQL, Prisma e a API NestJS não dependem dessa integração.
Caso uma dependência direta não identificada seja encontrada na validação, a Data API
poderá ser reativada antes da continuidade, sem alterar dados.

### 4.2 Grants atuais e futuros

Uma migration Prisma versionada revogará, quando as roles existirem:

- `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER`
  sobre tabelas públicas de `anon`, `authenticated` e `service_role`;
- `USAGE`, `SELECT` e `UPDATE` sobre sequências públicas dessas roles;
- `EXECUTE` sobre funções públicas dessas roles e de `PUBLIC`.

A mesma migration alterará os default privileges do papel `postgres` para que novos
objetos não recebam essas permissões automaticamente. As verificações de existência
das roles serão condicionais para a migration funcionar também no PostgreSQL local,
onde as roles específicas do Supabase podem não existir.

Grants futuros serão sempre opt-in e deverão aparecer explicitamente em migration,
junto das policies correspondentes.

### 4.3 RLS deny-by-default

RLS será habilitado explicitamente em todas as tabelas de aplicação existentes no
schema `public`. `_prisma_migrations` não é uma tabela de aplicação e ficará fora da
lista; sua proteção continuará baseada em grants e na Data API desabilitada.

Cada tabela de aplicação receberá uma policy com estas propriedades:

- nome padronizado `deny_data_api_access`;
- `AS RESTRICTIVE`;
- `FOR ALL`;
- `TO PUBLIC`;
- `USING (false)`;
- `WITH CHECK (false)`.

A policy restritiva torna o bloqueio deliberado e elimina o estado ambíguo de “RLS
habilitado sem policy”. Para conceder acesso direto no futuro, uma migration deverá
remover essa policy e substituí-la por policies de ownership revisadas.

O papel `postgres` continuará ignorando RLS por `BYPASSRLS`. Por isso, a policy não
substitui a autorização existente na API.

### 4.4 Tabelas cobertas

A migration enumerará explicitamente as tabelas, evitando SQL dinâmico que alcance
objetos internos ou futuros sem revisão:

- `User`, `DailyTracking`;
- `clients`, `client_audit_events`;
- `professional_patient_links`;
- `diet_plans`, `meals`, `meal_items`, `foods`, `food_preferences`, `meal_logs`;
- `physical_assessments`, `physio_assessments`;
- `workouts`, `workout_splits`, `workout_exercises`, `workout_logs`,
  `workout_log_sets`;
- `rehab_plans`, `rehab_sessions`, `rehab_exercises`;
- `anamneses`;
- `supplement_plans`, `supplement_items`;
- `lab_exams`, `lab_markers`;
- `patient_alerts`, `patient_consents`, `health_check_ins`;
- `agenda_tasks`, `agenda_task_occurrences`;
- `appointments`, `appointment_events`.

As futuras tabelas de receitas serão adicionadas explicitamente pela migration do
próprio módulo.

## 5. Arquivos e responsabilidades

### Migration Prisma

Uma nova pasta em `api/prisma/migrations/` conterá SQL idempotente dentro do escopo
da migration. O arquivo `schema.prisma` não precisa ser alterado nesta fase, pois RLS,
policies e grants não fazem parte do modelo declarativo do Prisma.

A migration será aplicada pelo fluxo `prisma migrate deploy`, preservando
`_prisma_migrations` como histórico canônico. O mesmo DDL não será aplicado antes por
`execute_sql` ou `supabase apply_migration`, evitando histórico divergente.

### Documentação de segurança

`docs/SECURITY.md` será atualizado para registrar:

- Data API desabilitada;
- grants opt-in;
- RLS defensivo e seu limite;
- permanência da autorização por `professionalId` como controle primário;
- requisito de migration e policy para qualquer exposição futura.

O ADR-002 permanece válido. Implementar RLS tenant-aware no Prisma exigirá um novo
ADR, porque altera o modelo de isolamento aceito.

### Rastreamento

`docs/TASKS.md` e `docs/agents/CODEX_STATUS.md` acompanharão a implementação e a
validação. Nenhum segredo, URL completa de banco ou chave será registrado.

## 6. Fluxo de implantação

1. Capturar snapshot somente estrutural de roles, grants, RLS e policies.
2. Validar a migration no PostgreSQL local e no banco isolado de testes.
3. Rodar builds e testes de autorização da API.
4. Aplicar a migration em produção por `prisma migrate deploy`.
5. Desabilitar a Data API no painel Supabase.
6. Executar verificações negativas contra REST/GraphQL sem registrar dados clínicos.
7. Executar smoke tests dos fluxos NestJS/Prisma.
8. Consultar novamente o Security Advisor e registrar apenas metadados do resultado.

Falha em qualquer gate interrompe a implantação. Não haverá tentativa de “corrigir”
o problema concedendo privilégios amplos ou removendo guards.

## 7. Tratamento de falhas e reversão

- A Data API pode ser reativada de forma reversível no painel se uma dependência
  legítima for descoberta.
- Migrations aplicadas não serão editadas ou apagadas. Qualquer correção será uma
  nova migration forward-only.
- Como o Prisma usa `BYPASSRLS`, a habilitação do RLS não deve afetar a API. Se um
  ambiente usar papel diferente, a implantação deve parar antes de produção.
- Grants não serão restaurados como rollback automático. Uma restauração exigirá
  caso de uso explícito, privilégios mínimos e policies de ownership aprovadas.
- Nenhum teste ou log consultará ou imprimirá conteúdo clínico.

## 8. Estratégia de testes

### Banco local

- migration aplica mesmo sem as roles `anon`, `authenticated` e `service_role`;
- todas as tabelas de aplicação ficam com `relrowsecurity = true`;
- cada tabela coberta possui `deny_data_api_access` restritiva;
- `_prisma_migrations` continua operacional;
- `prisma migrate status` permanece consistente.

### API

- build do NestJS;
- testes unitários existentes;
- E2E de autenticação e limites profissionais;
- E2E de clientes, dietas, avaliações e agenda;
- verificação de que recursos de outra conta continuam retornando `404`.

### Produção

- `anon`, `authenticated` e `service_role` continuam com zero tabelas alcançáveis;
- Data API não atende consultas REST/GraphQL;
- a API NestJS mantém leitura e escrita nos fluxos críticos;
- Security Advisor não reporta tabela de aplicação com RLS ausente ou sem policy;
- nenhuma policy permissiva aparece no schema `public`.

## 9. Critérios de aceite

A fase estará concluída somente quando:

1. a migration estiver versionada e aplicada com histórico Prisma consistente;
2. a Data API estiver desabilitada;
3. os grants atuais e futuros estiverem revogados;
4. todas as 33 tabelas de aplicação estiverem com RLS e policy restritiva;
5. os testes de ownership e os fluxos críticos do NestJS passarem;
6. os advisors forem reexecutados após a mudança;
7. `docs/SECURITY.md` refletir com precisão o que foi implementado;
8. nenhum resultado for descrito como “RLS por profissional” ou “isolamento no banco”.

## 10. Evolução posterior: RLS tenant-aware

Uma fase separada poderá implementar isolamento real no PostgreSQL com:

- papel dedicado de aplicação, sem `BYPASSRLS` e sem ownership das tabelas;
- contexto transacional de `professionalId` definido pelo NestJS depois de validar o
  JWT;
- policies específicas para tabelas diretas e relações indiretas;
- índices para todas as colunas consultadas pelas policies;
- testes com dois profissionais e tentativa cruzada em cada domínio;
- plano de compatibilidade com pooling e transações do Prisma.

Essa evolução começará por um piloto em `clients` e `diet_plans`. Só depois de
validada poderá substituir a autorização app-level como última barreira contra BOLA.

## 11. Fora do escopo

- migrar autenticação para Supabase Auth;
- expor tabelas ao navegador;
- criar policies permissivas com `auth.uid()`;
- trocar a connection string ou o papel do Prisma;
- implementar o RLS tenant-aware descrito na seção 10;
- alterar dados, relações ou modelos Prisma;
- implementar o Banco de Receitas nesta mesma migration.
