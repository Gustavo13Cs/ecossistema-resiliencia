# Remediacao Ponta a Ponta de Seguranca e Qualidade

**Data:** 2026-09-29
**Status:** Aprovado pelo mantenedor; planos A-D concluídos
**Branch:** `agent/codex/security-remediation`
**Base:** `origin/main` em `dcca5e591e9ebda2dd57fb94a40153af99355767`

## 1. Objetivo

Corrigir os 15 achados da auditoria de seguranca e qualidade sem interromper os
fluxos profissionais existentes. Ao final, todo dado clinico acessivel pela API
deve pertencer a um `Client` privado do profissional autenticado, a sessao deve
ser revogavel, o frontend nao deve persistir informacao clinica sensivel no
navegador e os processos de banco e build devem falhar de forma segura.

O produto permanece profissional-first: `Client` e prontuario, `User` e
identidade autenticavel, cada conta possui uma unica especialidade e nao sera
reintroduzido portal de paciente.

## 2. Escopo dos 15 achados

1. BOLA nas rotas e overview de `users`.
2. BOLA nos modulos clinicos legados.
3. Desativacao cruzada e criacao nao atomica de planos.
4. XSS nos documentos de pedidos de exames.
5. Dados clinicos em `localStorage` e fallback fail-open.
6. Fisioterapia usando model incorreto e sem ownership persistido.
7. JWT longo, nao revogavel e com role obsoleta.
8. Cookie de autenticacao com fallback inseguro para `Secure=false`.
9. Dependencias vulneraveis e dependencias de desenvolvimento em runtime.
10. Validacao e type safety enfraquecidas.
11. Mistura entre `Client.id` e `User.id`.
12. Cron de alertas destrutivo sem transacao ou lock.
13. Autenticacao global fail-open e modulos legados fora do runtime.
14. Funcoes PostgreSQL com `search_path` mutavel.
15. Chaves estrangeiras sem indices adequados.

## 3. Estrategia escolhida

A implementacao sera uma migracao incremental compativel. Novas operacoes usam
`Client.id` e ownership direto por `Client.professionalId`. Campos legados de
`User` permanecem temporariamente apenas para leitura historica quando a origem
puder ser provada. Nenhum registro clinico sera associado automaticamente a um
Client quando houver mais de um profissional possivel ou quando o autor nao
puder ser determinado.

Alternativas rejeitadas:

- Corte imediato dos campos `patientId`/`userId`: quebraria telas e dados ainda
  dependentes do modelo antigo.
- Apenas adicionar guards ao legado: conteria parte da BOLA, mas manteria duas
  fontes de ownership e prolongaria a arquitetura insegura.

## 4. Limites de autorizacao

### 4.1 Regra central

Toda leitura, criacao, alteracao ou exclusao clinica recebe o `AuthUser` do JWT
e um `clientId`. Antes da primeira query do recurso, o service chama
`ClientAccessService.getOwnedClient(user, clientId)`. Falhas de ownership usam
`404` para nao revelar a existencia de prontuarios de outra conta.

Controllers nao calculam autorizacao por booleanos como `isProfessional`, nao
aceitam `professionalId`/`creatorId` no body e nao confiam em IDs de usuario
enviados pelo navegador.

### 4.2 Overview e perfil

O overview clinico sai de `/users/:id/overview` e passa a operar em
`/clients/:clientId/overview`. Cada consulta interna inclui simultaneamente o
`clientId` e o profissional autor quando o recurso possui `creatorId`.

`/users/:id` fica restrito ao proprio usuario autenticado e a operacoes
administrativas nao clinicas explicitamente autorizadas. `ADMIN` nao recebe
acesso clinico implicito. `PHYSIO`, `PERSONAL` e `NUTRITIONIST` recebem apenas os
dominios definidos em `DOMAIN_ROLES`.

### 4.3 Defesa em profundidade

O `JwtAuthGuard` torna-se `APP_GUARD`. Apenas login, registro e endpoints
publicos deliberados usam `@Public()`. Guards de role e ownership continuam nos
controllers/services para que um erro de roteamento nao remova o isolamento.

## 5. Modelo de dados e migrations

### 5.1 Recursos migrados para Client

Os seguintes models passam a ter relacao obrigatoria ou transicional com
`Client`:

- `Workout`
- `RehabPlan`
- `PhysioAssessment`
- `Anamnesis`
- `SupplementPlan`
- `LabExam`
- `ConsultationNote`
- `DailyTracking`
- `PatientAlert`
- novo `ClientGoal`
- novo `LabOrder`

`Workout`, `RehabPlan`, `Anamnesis`, `SupplementPlan`, `LabExam` e
`ConsultationNote` preservam `creatorId`. `PhysioAssessment` recebe
`creatorId`, que hoje nao existe. `DailyTracking` recebe `professionalId` para
tornar a origem auditavel. `PatientAlert` recebe `clientId`; novos snapshots
usam `clientId` e `professionalId`, deixando `patientId` apenas como referencia
historica nullable.

Durante a transicao, os models clinicos existentes usam `clientId String?` e
relacao nullable com `Client`; seus campos legados tambem se tornam nullable.
Depois que o backfill seguro e os consumidores forem verificados, uma entrega
futura podera tornar `clientId` obrigatorio e remover os campos antigos.

`ClientGoal` possui um registro corrente por Client (`@@unique([clientId])`),
`professionalId`, categoria, status, datas inicial/alvo, medidas inicial/alvo,
metas de agua, sono, refeicoes e passos, notas e timestamps. Metas sao criadas
ou atualizadas apenas pelo owner do Client.

`LabOrder` possui `clientId`, `professionalId`, titulo opcional do protocolo,
`markers String[]`, indicacao clinica, instrucoes de preparo, `issuedAt` e
timestamps. O nome do cliente nao e duplicado: respostas carregam o nome pela
relacao owned com `Client`.

### 5.2 Compatibilidade legada

As colunas `userId`/`patientId` existentes ficam nullable durante a transicao.
Novas escritas gravam `clientId` e deixam o identificador legado nulo. Reads
padrao nunca fazem fallback silencioso para `patientId`.

O backfill sera conservador:

1. migrar apenas quando houver exatamente um Client compativel e o profissional
   autor do recurso for o mesmo owner;
2. manter `clientId = NULL` quando a autoria for ausente ou ambigua;
3. nao expor registros nao migrados pelas novas rotas profissionais;
4. produzir consultas de auditoria com contagens antes/depois, sem dados
   clinicos em logs.

### 5.3 Indices e funcoes

Cada FK usada por ownership ou listagem recebe indice composto coerente com a
query, por exemplo `(clientId, createdAt)`, `(creatorId, clientId, isActive)` e
`(professionalId, completedAt)`. Os 31 avisos do advisor serao revisados; nao
serao criados indices duplicados ou sem consumidor real.

As tres funcoes criadas pela migration de receitas recebem
`SET search_path = pg_catalog, public` por uma nova migration forward-only com
`ALTER FUNCTION`; a migration historica ja publicada nao sera reescrita.
Nenhuma funcao sera convertida para `SECURITY DEFINER`.

### 5.4 RLS

O RLS defensivo e a ausencia de grants para `anon`/`authenticated` permanecem.
A migration nao depende do RLS para isolamento entre contas, pois a conexao
Prisma possui privilegios que podem contorna-lo. Ownership continua obrigatorio
nos services NestJS.

## 6. Contratos da API

### 6.1 DTOs

DTOs clinicos usam `clientId: UUID`, limites de comprimento, limites numericos,
`ArrayMaxSize` e validacao aninhada com `@Type`. Campos internos como
`professionalId`, `creatorId`, `userId` e `patientId` nao fazem parte dos DTOs
publicos novos.

`SupplementsController` deixa de receber `any`; itens de suplemento ganham DTO
proprio. O indexador `[x: string]: any` e removido do `PrismaService`, e
`noImplicitAny` volta a ser habilitado.

### 6.2 Planos ativos

Criacao de treino e reabilitacao ocorre em uma unica transacao:

1. resolver Client do profissional;
2. desativar somente planos ativos do mesmo `clientId` e `creatorId`;
3. criar o novo plano e seus filhos;
4. reverter tudo se qualquer operacao falhar.

### 6.3 Fisioterapia

O service usa `prisma.physioAssessment`, nunca `physicalAssessment`. Create,
listagem, leitura e delete exigem `clientId` owned e `creatorId` autenticado.

### 6.4 Modulos de paciente antigos

`ConsentsModule`, `HealthCheckInsModule`, `MealLogsModule`, `WorkoutLogsModule`,
`AgendaModule` e `MetricsModule` nao serao simplesmente expostos com contratos
`PATIENT`. Como o produto nao possui portal de paciente e a agenda profissional
ativa usa `AppointmentsModule`, o codigo de runtime dessas rotas sera removido
nesta remediacao depois de uma busca por consumidores. Tabelas e models
historicos permanecem para preservacao de dados, sem controllers, services ou
modules inacessiveis. Se surgir consumidor profissional real, ele sera migrado
para um endpoint por Client antes da remocao.

## 7. Sessao e cookies

### 7.1 Sessao revogavel

`User` recebe `authVersion Int @default(0)`. Sera criado `AuthSession` com
`id`, `userId`, `refreshTokenHash`, `expiresAt`, `revokedAt`, `lastUsedAt`,
`createdAt` e `updatedAt`. O access token dura 15 minutos e carrega `sub`,
`jti = AuthSession.id` e `authVersion`; a role efetiva e o estado da sessao sao
recarregados do banco durante toda validacao.

O refresh token dura 30 dias e tem formato opaco `<sessionId>.<secret>`. O
secret aleatorio e armazenado somente em cookie HttpOnly e persistido apenas
por hash. Refresh substitui o hash em transacao. Um token antigo encontra a
sessao pelo ID, falha na comparacao do hash e revoga a sessao. Logout revoga a
sessao no servidor antes de limpar os cookies.

Alteracao de role, bloqueio ou reset de credenciais invalida sessoes ativas.

### 7.2 Cookies

Em producao, ausencia de `AUTH_COOKIE_SECURE=true` aborta o bootstrap. Cookies
de access e refresh usam `HttpOnly`, `Secure`, `SameSite` configurado, path
minimo necessario e a mesma policy para set/clear. `access_token` usa path `/`;
`refresh_token` usa por padrao `/api/auth`, que corresponde ao rewrite
same-origin do frontend, e pode usar outro path absoluto validado por ambiente.
Ambos usam `SameSite=lax` por padrao. O token CSRF continua separado, e
refresh/logout exigem origem permitida e token CSRF valido com comparacao
constante.

## 8. Frontend e documentos

### 8.1 Identificadores

Paginas sob `/clientes/[id]` tratam o parametro exclusivamente como `Client.id`.
Elas carregam `/clients/:id` e enviam `clientId` aos endpoints. O navegador nao
resolve nem transmite `User.id` para recursos clinicos novos.

### 8.2 Persistencia clinica

`useCentralLabExams` e `useClientGoals` deixam de usar `localStorage`. Exames,
pedidos (`LabOrder`) e metas (`ClientGoal`) usam endpoints autenticados e
TanStack Query apenas como cache em memoria. Falha de API mantem a interface em
erro e nunca gera entidade local nem toast de sucesso.

O novo recurso de metas pertence a `Client` e ao profissional autenticado. Seed
sintetico nao sera persistido nem exibido como dado clinico real.

### 8.3 XSS e impressao

Um builder compartilhado de documentos escapa todos os valores dinamicos,
converte quebras de linha com seguranca e nao inclui scripts inline. A janela de
impressao recebe HTML sanitizado e `print()` e chamado pelo codigo que abriu a
janela.

A CSP de producao migra de `script-src 'unsafe-inline'` para nonces por request.
`web/proxy.ts` gera um nonce criptograficamente aleatorio, define a CSP da
response e encaminha `x-nonce`; o layout aplica esse nonce aos scripts exigidos
pelo Next. Desenvolvimento pode manter `unsafe-eval` estritamente para tooling,
mas producao nao permite `unsafe-inline` nem `unsafe-eval` em `script-src`.

## 9. Processos atomicos e concorrencia

O cron de alertas calcula e substitui o snapshot dentro de uma transacao. Um
`pg_advisory_xact_lock` impede duas instancias concorrentes. A remocao dos
alertas antigos ocorre somente depois de todos os dados necessarios terem sido
calculados com sucesso.

Erros do cron preservam o snapshot anterior e sao logados apenas com contexto
operacional, sem nomes, exames ou outras informacoes clinicas.

## 10. Dependencias e imagens de producao

Dependencias com advisories altos/criticos serao atualizadas para versoes
compativeis e corrigidas. Alteracoes breaking serao tratadas por testes, nao por
`npm audit fix --force` cego. Lockfiles permanecem versionados.

A imagem da API usa um stage de dependencias de producao com `npm ci --omit=dev`.
O frontend usa `output: 'standalone'` e copia somente o runtime standalone,
assets estaticos e `public`. Cypress, Vitest, ESLint, TypeScript e outras
ferramentas nao entram nas imagens finais.

## 11. Testes e criterios de aceite

Cada entrega segue Red-Green-Refactor. Testes de seguranca devem provar tanto o
caso permitido quanto a negacao antes de qualquer query Prisma mutavel.

Obrigatorios:

- profissional A nao le, cria, altera, desativa ou remove dados do Client B;
- `ADMIN` nao recebe acesso clinico implicito;
- payloads com `professionalId`, `creatorId`, `patientId` ou `userId` indevidos
  sao rejeitados pelo ValidationPipe;
- falha ao criar plano reverte a desativacao anterior;
- valores HTML maliciosos aparecem como texto em documentos impressos;
- nenhum hook clinico chama `localStorage`;
- falha da API nao produz entidade ou mensagem de sucesso local;
- refresh rotaciona token, logout revoga e role alterada vale imediatamente;
- producao nao inicializa com cookie inseguro;
- duas execucoes do cron nao apagam o snapshot valido;
- migration preserva linhas ambiguas sem associa-las ao Client errado;
- Prisma validate/generate, builds, unitarios e lint ficam verdes;
- E2E API usa PostgreSQL isolado e cobre ownership cruzado;
- Cypress cobre treino, reabilitacao, exames, metas e sessao com dados reais;
- advisors Supabase nao reportam novos problemas de seguranca, funcoes ou FKs.

Linha de base confirmada neste worktree antes de qualquer mudanca funcional:

- API: 24/24 suites e 279/279 testes;
- frontend: 39/39 arquivos e 274/274 testes;
- API `npm audit --omit=dev`: 6 vulnerabilidades (4 altas, 2 moderadas),
  verificadas novamente em 2026-09-29;
- frontend `npm audit --omit=dev`: 0 vulnerabilidades, verificadas novamente em
  2026-09-29.

## 12. Entregas e ordem

### Entrega A - Ownership e schema clinico

Corrige achados 1, 2, 3, 6, 10 e 11. Inclui migrations, DTOs, services,
controllers e frontend de treino/reabilitacao/anamnese/exames/notas.

### Entrega B - Frontend seguro e persistencia

Corrige achados 4 e 5. Inclui documentos seguros, metas persistidas na API,
remocao de fallbacks locais e CSP por nonce.

### Entrega C - Sessao e supply chain

Corrige achados 7, 8 e 9. Inclui sessao revogavel, cookies fail-closed,
atualizacoes de dependencias e imagens minimas.

### Entrega D - Operacao e qualidade

Corrige achados 12, 13, 14 e 15 e fecha os gates globais de lint, testes,
migrations e advisors.

Cada entrega deve ser testavel e revisavel isoladamente, mas a branch so sera
considerada concluida quando os 15 itens e os gates finais estiverem atendidos.

## 13. Implantacao e rollback

1. validar migrations em PostgreSQL isolado;
2. registrar contagens agregadas de linhas migraveis, ambiguas e nao migradas;
3. aplicar schema aditivo antes de publicar API que usa os novos campos;
4. publicar API compativel com campos legados nullable;
5. publicar frontend somente depois da API;
6. executar smokes de login, clients e cada dominio profissional;
7. revisar advisors e logs sem conteudo clinico;
8. remover campos/rotas legados apenas em uma entrega futura, apos comprovacao
   de que nao existem consumidores ou linhas pendentes.

Rollback de aplicacao volta API/frontend sem apagar colunas novas. Migrations
nao devem remover dados nesta entrega. Se houver falha, novas escritas podem ser
interrompidas enquanto o schema aditivo permanece preservado.

## 14. Fora de escopo

- portal ou login de paciente;
- colaboracao entre profissionais/clinicas;
- CASL, Oso ou outra nova engine de autorizacao;
- reescrita completa dos modulos clinicos;
- aplicacao direta de migrations no banco de producao;
- exclusao definitiva de dados clinicos legados;
- mudanca visual ampla sem relacao com seguranca.

## 15. Definicao de concluido

A remediacao termina quando cada achado possui teste de regressao, todos os
acessos clinicos ativos passam por ownership de Client, nenhuma informacao
clinica e persistida no navegador, sessoes podem ser revogadas, imagens de
runtime nao carregam ferramentas de desenvolvimento, migrations e advisors
estao validados em ambiente isolado e os gates completos estao verdes ou com
qualquer bloqueio externo explicitamente documentado.
