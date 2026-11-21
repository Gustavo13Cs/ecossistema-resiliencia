# Performance 18 — instrumentação de duração, etapas e correlação API/banco

## Resultado

Alteração entregue no commit **`e912854`** na branch `agent/codex/performance-diagnosis`, comparada ao baseline `81cf592`. O interceptor global `ClinicalContextInterceptor` e os clientes Prisma/PostgreSQL (`clinical`, `auth` e `jobs`) passaram a medir duração total e por etapa de cada requisição, atribuir spans SQL via `AsyncLocalStorage`, correlacionar API e PostgreSQL por `X-Request-Id` e `traceparent` W3C, redigir dados clínicos/segredos de forma defensiva e agregar percentis (`p50`, `p95`, `p99`) e top rotas lentas em memória.

Nenhuma dependência nova foi adicionada em `api/package.json` ou `web/package.json`, e não houve alterações em `schema.prisma`, migrations, políticas RLS, autenticação, `PAGINATION_EXPOSED_HEADERS` ou frontend (`web/`).

## Arquitetura implementada

### 1. Medição por etapa e cabeçalhos (`ClinicalContextInterceptor`)

- **`api/src/common/clinical-context/clinical-context.interceptor.ts`:**
  - Gera `X-Request-Id` (UUID) em todas as rotas (`auth`, `health`, `observability` e clínicas) e propaga/cria contexto W3C `traceparent` (`traceId`, `spanId`, `parentSpanId` opcional).
  - Cronometra em alta resolução (`process.hrtime.bigint()`) as etapas:
    - `totalMs`: duração total no interceptor;
    - `txAcquireMs`: tempo para adquirir conexão e iniciar a transação PostgreSQL;
    - `rlsContextMs` (registrado em `api/src/infra/database/prisma.service.ts`): tempo do `SELECT set_config(...)` de RLS;
    - `handlerMs`: execução do controller/service;
    - `validationMs`: validação de ownership de saída (`ClinicalResponseValidator.validate`);
    - `txCommitMs`: duração de `COMMIT` / `ROLLBACK` da transação;
    - `dbMs`: soma de `txAcquireMs + queryMs + commitMs`.
  - Emite o cabeçalho `Server-Timing` apenas nas rotas clínicas autenticadas (omitido deliberadamente de `auth`, `health` e `observability` para evitar canais laterais de temporização em login/registro/refresh), respeitando `OBSERVABILITY_SERVER_TIMING !== 'false'` e `!response.headersSent`.
  - Mantém inalterado o tratamento de erros (`HttpException`, `P2034` → `409 ConflictException`, demais erros → `500 InternalServerErrorException` genérico).

### 2. Correlação API ↔ banco sem exposição clínica (`sql-instrumentation.ts`)

- **`api/src/common/observability/sql-instrumentation.ts`** e **`api/src/infra/database/database-clients.ts`:**
  - Envolve o driver adapter `PrismaPg` dos três clientes (`clinical`, `auth` e `jobs`) via `instrumentDriverAdapterFactory`.
  - Propaga a correlação pelo `AsyncLocalStorage` (`request-telemetry.context.ts`) junto com o GUC `safemove.request_id` já aplicado em `PrismaService.runAsProfessional`.
  - Extrai apenas `operation` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `SET_CONFIG`, `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `OTHER`) e `target` (identificador sanitizado da tabela ou `rls_context`/`transaction`). Nunca lê ou registra `query.args` nem texto SQL bruto.
  - Classifica `COMMIT`/`ROLLBACK` em `txCommitMs` sem inflar `dbQueryCount`.
  - Dispara evento estruturado `db_slow_query` quando uma query atinge `OBSERVABILITY_SLOW_QUERY_MS`.

### 3. Redação defensiva e logs estruturados (`log-redaction.ts`, `request-telemetry.logger.ts`)

- **`api/src/common/observability/log-redaction.ts`:**
  - Normaliza templates de rota (`resolveRouteTemplate`, substituindo UUIDs, CUIDs, IDs numéricos e tokens por `:id` e removendo query strings).
  - Mapeia códigos de erro seguros (`safeErrorCode`, sem propagar `error.message`, `error.stack` ou DSNs).
  - Aplica `redactLogRecord` recursivamente sobre qualquer registro emitido (lista explícita de chaves clínicas/PII/segredos + tokenização camelCase/snake_case e redação de strings com DSN `postgres(ql)://` ou JWTs `eyJ...`), mantendo intactos os campos técnicos de telemetria (`dbQueryCount`, `slowQueryCount`, `target`, `slowestTarget`).
- **`api/src/common/observability/request-telemetry.logger.ts`:**
  - Emite linhas JSON estruturadas (`http_request_completed`, `db_slow_query`, `http_metrics_summary`) com suporte a modo silencioso em testes (`NODE_ENV=test` → `none` por padrão).

### 4. Percentis, top rotas lentas e endpoint administrativo (`request-metrics.service.ts`, `observability.controller.ts`)

- **`api/src/common/observability/request-metrics.service.ts`:**
  - Mantém janela circular limitada em memória (`256` amostras por rota, máximo de `200` rotas com fallback para `OTHER`).
  - Calcula `p50Ms`, `p95Ms`, `p99Ms`, `avgMs`, `maxMs`, `dbP50Ms`, `dbP95Ms`, `dbMaxMs`, `avgDbQueries`, `dbSharePercent` e `lastSlowRequest` (`requestId`, `traceId`, tempos e status), ordenando `topSlowRoutes` por `p95Ms` desc → `maxMs` desc → `count` desc.
- **`api/src/common/observability/observability.controller.ts`:**
  - Expõe `GET /observability/performance?top=1..50` protegido por `JwtAuthGuard` global + `@UseGuards(RolesGuard)` + `@Roles('ADMIN')`, com `Cache-Control: no-store` e `@ClinicalResponse({ exception: 'observability' })`.
  - Requisições ao próprio endpoint de observabilidade não são gravadas em `RequestMetricsService` para evitar distorção das estatísticas.

### 5. Avaliação OpenTelemetry

- Optou-se por não adicionar pacotes `@opentelemetry/*` nesta etapa para manter enxutas as dependências de runtime/imagem Docker.
- O formato W3C `traceparent` (`traceId`/`spanId`/`parentSpanId`), `X-Request-Id`, logs JSON estruturados e estágios explícitos já permitem ingestão direta por coletores OTel / pipelines de logs sem acoplamento de código e deixam um ponto único de extensão para exportar spans OTLP futuramente, caso necessário.

## Variáveis de ambiente opcionais

| Variável | Padrão | Intervalo / Valores | Uso |
|---|---|---|---|
| `OBSERVABILITY_SLOW_REQUEST_MS` | `300` | `1..60000` (ms) | Limiar para marcar requisição lenta e registrar `lastSlowRequest` |
| `OBSERVABILITY_SLOW_QUERY_MS` | `100` | `1..60000` (ms) | Limiar para emitir `db_slow_query` e incrementar `slowQueryCount` |
| `OBSERVABILITY_LOG_REQUESTS` | `none` em `test`, `all` fora de `test` | `all \| slow \| none` | Controle de emissão de logs JSON por requisição |
| `OBSERVABILITY_SERVER_TIMING` | `true` | `'false'` desativa | Emissão do header `Server-Timing` em rotas clínicas |
| `OBSERVABILITY_SUMMARY_INTERVAL_MS` | `0` (desligado) | `10000..3600000` (ms) | Intervalo opcional (`.unref()`) para resumo periódico `http_metrics_summary` |

## Regressões e validação

- **Novas suítes unitárias criadas:**
  - `api/src/common/observability/log-redaction.spec.ts`
  - `api/src/common/observability/request-metrics.service.spec.ts`
  - `api/src/common/observability/sql-instrumentation.spec.ts`
  - `api/src/common/observability/observability.controller.spec.ts`
  - `api/src/common/clinical-context/clinical-context.interceptor.spec.ts`
- **Testes focados (`npm --prefix api test -- src/common/observability/ src/common/clinical-context/`):** **6/6 suítes, 32/32 testes aprovados**.
- **Suíte unitária completa (`npm --prefix api test`):** **68/69 suítes, 840/841 testes aprovados**.
  - **Única falha (pré-existente de ambiente Windows, sem relação com o item 18):** `api/src/modules/workouts/exercise-demonstration-probe.spec.ts` (`Public media rules differ from verified API rules; run --write-public-rules`), causada por `core.autocrlf=true` no checkout Windows convertendo `i/lf` para `w/crlf` em `web/lib/exercise-media-rules.ts` (386 bytes em disco com CRLF vs 378 bytes em LF comparados por `api/scripts/verify-exercise-demonstrations.ts:80-86`). Nenhum arquivo de catálogo ou `.gitattributes` foi alterado fora do escopo.
- **ESLint:** `npx eslint` com `--max-warnings=0` nos arquivos alterados e `npx eslint "src/**/*.ts"` na API aprovados (código 0).
- **Build TypeScript (`npm --prefix api run build`):** aprovado (código 0).
- **Higiene de diff (`git diff --check`):** aprovado (código 0).
- **Observação de escopo:** o PostgreSQL de testes (Docker) não estava em execução neste ambiente; portanto, as suítes `test:e2e` contra PostgreSQL real não foram reexecutadas nesta sessão.

## Reprodução

Na raiz do repositório:

1. Testes focados de observabilidade e contexto clínico:
   ```powershell
   npm --prefix api test -- src/common/observability/ src/common/clinical-context/
   ```
2. Lint e build da API:
   ```powershell
   Push-Location api; npx eslint "src/**/*.ts"; Pop-Location
   npm --prefix api run build
   ```

## Rollback

Reverter o commit **`e912854`** (`git revert e912854`) e reconstruir a API. Não há migrations, alterações de schema ou novas dependências envolvidas.
