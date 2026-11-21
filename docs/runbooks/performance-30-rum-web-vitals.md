# Performance 30 — RUM / Web Vitals em produção

## Resultado

Alteração entregue no commit **`9cf2ad6`** na branch `agent/codex/performance-diagnosis`, comparada ao baseline `3e33847`. Antes, havia apenas `@vercel/analytics` listado em `web/package.json` sem instrumentação ativa de Web Vitals nem painel administrativo segmentado.

Agora a aplicação coleta métricas reais de **Real User Monitoring (RUM)** no navegador (`LCP`, `INP`, `CLS`, `FCP`, `TTFB`) utilizando o hook nativo do Next.js 16 (`next/web-vitals`), sanitiza rotas no cliente e no servidor contra uma allowlist estrita de templates (impedindo vazamento de IDs de paciente, slugs ou query strings), envia lotes em segundo plano para a API first-party sem cookies (`credentials: 'omit'`) e exibe percentis (`p50`, `p75`, `p95`, `% Bom`) segmentados por **rota normalizada** e **dispositivo** (`Desktop`, `Tablet`, `Mobile`) no painel `ADMIN` em `/home`.

Escopo estritamente de aplicação (`api/src/common/observability/` e `web/`). Nenhuma dependência nova foi instalada, `@vercel/analytics`, `web/package.json`, `web/proxy.ts`, `schema.prisma`, migrations e policies RLS permaneceram intactos.

## Mudanças aplicadas

### Backend (`api/src/common/observability/`)

| Arquivo | Função |
|---|---|
| [`web-vitals-routes.ts`](../../api/src/common/observability/web-vitals-routes.ts) | Allowlist de **21 rotas estáticas** + **11 sub-rotas dinâmicas** de `/clientes/:id/...` (e fallback `'/other'`), além dos limiares oficiais de rating (`good`, `needs-improvement`, `poor`) e arredondamento específico para `CLS` vs ms |
| [`dto/web-vitals.dto.ts`](../../api/src/common/observability/dto/web-vitals.dto.ts) | DTOs estritos (`whitelist` / `forbidNonWhitelisted`), lote limitado (`1..10`), validação condicional `@ValidatorConstraint` para limites de `CLS` (`0..100`) e métricas temporais (`0..60_000` ms) |
| [`web-vitals-metrics.service.ts`](../../api/src/common/observability/web-vitals-metrics.service.ts) | Agregador em memória com ring buffer por bucket `(rota, dispositivo, métrica)` (`WINDOW_SIZE = 256`), cálculo de `p50`/`p75`/`p95` sobre janela consolidada, ordenação por severidade de `p75` e emissão de logs estruturados |
| [`request-telemetry.logger.ts`](../../api/src/common/observability/request-telemetry.logger.ts) | Adiciona `logWebVital()` utilizando a chave `metric` (evitando conflito com a chave `'name'` redigida em `log-redaction.ts`) |
| [`web-vitals.controller.ts`](../../api/src/common/observability/web-vitals.controller.ts) | `POST /observability/web-vitals` marcado com `@Public()`, `@HttpCode(202)`, `@Throttle({ default: { ttl: 60_000, limit: 30 } })`, `Cache-Control: no-store` e `@ClinicalResponse({ exception: 'observability' })` |
| [`observability.controller.ts`](../../api/src/common/observability/observability.controller.ts) e [`observability.module.ts`](../../api/src/common/observability/observability.module.ts) | Adiciona `GET /observability/web-vitals` protegido por `@Roles('ADMIN')` e `RolesGuard` (com filtros opcionais `route`, `device`, `top`) sem alterar `GET /observability/performance` |

### Frontend (`web/`)

| Arquivo | Função |
|---|---|
| [`web/types/observability.ts`](../../web/types/observability.ts) | Tipos compartilhados do contrato RUM (`WebVitalsSnapshot`, `WebVitalMetricStats`, `WebVitalDeviceBreakdown`, `WebVitalRouteSegment`) |
| [`web/lib/web-vitals.ts`](../../web/lib/web-vitals.ts) | Normalização espelhada no cliente, classificação por largura de viewport (`<768` `mobile`, `<1024` `tablet`, `>=1024` `desktop`), formatação `pt-BR` e envio `fetch(..., { keepalive: true, credentials: 'omit' })` |
| [`WebVitalsReporter.tsx`](../../web/components/observability/WebVitalsReporter.tsx) | Componente cliente (`return null`) acoplado em [`web/app/layout.tsx`](../../web/app/layout.tsx) via `useReportWebVitals` com identidade de callback estável entre navegações SPA, atribuição de carga inicial (`TTFB`/`FCP`/`LCP`) à rota de entrada, `INP`/`CLS` à rota corrente, deduplicação e flush em lote (`visibilitychange`, `pagehide` e limite de fila) |
| [`useWebVitalsDashboard.ts`](../../web/hooks/features/useWebVitalsDashboard.ts) e [`web/lib/query-keys.ts`](../../web/lib/query-keys.ts) | Hook TanStack Query habilitado exclusivamente quando `user.role === 'ADMIN'`, com `retry: false` |
| [`AdminWebVitalsDashboard.tsx`](../../web/components/features/observability/AdminWebVitalsDashboard.tsx) e [`web/app/home/page.tsx`](../../web/app/home/page.tsx) | Painel carregado via `next/dynamic(..., { ssr: false })` somente para `ADMIN`: cards KPI (`LCP`, `INP`, `CLS`, `FCP`, `TTFB`), comparação por dispositivo, filtros por dispositivo/rota, tabela `Rota × Dispositivo` e estados honestos de vazio/erro recuperável (sem `<aside>` e sem `"Clientes"`, preservando os invariantes do Cypress E2E) |

## Garantias de privacidade e segurança

1. **Zero dados clínicos:** somente nomes/valores técnicos de Web Vitals (`LCP`, `INP`, `CLS`, `FCP`, `TTFB`), categoria de dispositivo e template de rota normalizado são aceitos pela DTO e armazenados/logados. Query strings, fragmentos `#` e identificadores de paciente/rascunho/treino são descartados em dois níveis (cliente e servidor).
2. **Isolamento de sessão e CSRF:** o envio RUM usa `fetch('/api/observability/web-vitals', { keepalive: true, credentials: 'omit' })` — sem cookies HttpOnly nem `localStorage`/`sessionStorage`, compatível com `createCsrfProtection` mesmo durante sessões autenticadas.
3. **Leitura restrita:** apenas usuários `ADMIN` autenticados acessam `GET /observability/web-vitals` (`401` anônimo, `403` profissionais). `POST /observability/web-vitals` usa `@ClinicalResponse({ exception: 'observability' })`, portanto não polui as métricas de latência da API em `GET /observability/performance`.
4. **CSP intacta:** utiliza `next/web-vitals` empacotado pelo próprio Next.js no mesmo domínio (`connect-src 'self'`), sem scripts inline sem nonce nem domínios externos adicionais.

## Verificação ao vivo no Chrome headless (servidor Next.js de produção + NestJS local)

Executado com servidor de produção do Next.js **16.3.6** local servindo `.next`, proxy `/api/observability/web-vitals` conectado a servidor NestJS com `WebVitalsController`, `ObservabilityController`, `ValidationPipe` e `createCsrfProtection` reais na porta `3000`, e Chrome headless via CDP em contextos isolados:

- **Envios RUM (`POST /api/observability/web-vitals`):** **10/10 requisições** retornaram **HTTP 202**, todas com **`hasCookieHeader: false`**.
- **Amostras coletadas em sessões reais de navegação:** **16 amostras** distribuídas em **3 rotas** (`/`, `/auth/login`, `/auth/register`) e **5 segmentos rota × dispositivo**:
  - **Desktop (`1440×900`):** `8` amostras — `LCP p75: 420 ms`, `FCP p75: 420 ms`, `TTFB p75: 289,7 ms`
  - **Mobile (`390×844`):** `8` amostras — `LCP p75: 128 ms`, `FCP p75: 128 ms`, `TTFB p75: 25,5 ms`
- **Renderização do painel `ADMIN` em `/home`:** `<h1>Painel administrativo</h1>` e `<h2>Web Vitals em produção (RUM)</h2>` visíveis com **5 linhas** na tabela rota × dispositivo, **`hasAside: false`**, **`hasCapitalClientes: false`**, **`0` erros de segurança/CSP** e **`0` exceções JS**.

**Limites explícitos:** o agregador de Web Vitals opera em memória por instância do processo API (ideal para visualização imediata em painel e ingestão em logs estruturados JSON sem alterar o schema Prisma; em múltiplas réplicas, métricas agregadas ficam por réplica até eventual consolidação externa/logs). Testes E2E completos contra PostgreSQL e Cypress não rodaram localmente por ausência de container Postgres ativo.

## Regressões e validação

- **API Jest focado (`7` suítes):** **7/7 suítes, 31/31 testes aprovados** (`web-vitals-metrics.service.spec.ts`, `observability.controller.spec.ts`, `request-metrics.service.spec.ts`, `log-redaction.spec.ts`, `clinical-context.interceptor.spec.ts`, `strict-type-contracts.spec.ts`, `app.module.spec.ts`).
- **API Jest completo (`npm --prefix api test`):** **69/70 suítes, 849/850 testes aprovados**.
  - **Única falha (pré-existente no checkout Windows CRLF):** `src/modules/workouts/exercise-demonstration-probe.spec.ts`.
- **`npm --prefix api run build` (`nest build`) e ESLint (`--max-warnings=0` em `api/src/common/observability/**/*.ts`):** aprovados (0 erros, 0 warnings).
- **Web Vitest focado (`5` arquivos):** **5/5 arquivos, 25/25 testes aprovados** (`lib/web-vitals.test.ts`, `components/observability/WebVitalsReporter.test.tsx`, `components/features/observability/AdminWebVitalsDashboard.test.tsx`, `app/layout.test.tsx`, `proxy.test.ts`).
- **Web Vitest completo (`npm --prefix web test`):** **106/107 arquivos, 820/821 testes aprovados**.
  - **Única falha (pré-existente no checkout Windows CRLF):** `web/test/licensed-media-fixture.test.ts`.
- **`npm --prefix web run typecheck`, `npm --prefix web run lint` (`eslint . --max-warnings=0`), e `$env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build` (`postbuild`):** aprovados (**32/32 páginas** com contrato de direção + nonce CSP 128-bit e **297 diretórios** standalone validados).
- **`git diff --check`:** aprovado (código 0).

## Reprodução e conferência manual

1. Rodar as validações estáticas e unitárias:
   ```powershell
   npm --prefix api test -- src/common/observability/web-vitals-metrics.service.spec.ts src/common/observability/observability.controller.spec.ts src/common/observability/request-metrics.service.spec.ts src/common/observability/log-redaction.spec.ts src/common/clinical-context/clinical-context.interceptor.spec.ts src/strict-type-contracts.spec.ts src/app.module.spec.ts
   npm --prefix api run build
   Push-Location api; npx eslint --max-warnings=0 "src/common/observability/**/*.ts"; Pop-Location
   npm --prefix web test -- lib/web-vitals.test.ts components/observability/WebVitalsReporter.test.tsx components/features/observability/AdminWebVitalsDashboard.test.tsx app/layout.test.tsx proxy.test.ts
   npm --prefix web run typecheck
   npm --prefix web run lint
   $env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build
   ```
2. Em execução local ou produção:
   - Navegar por rotas públicas e clínicas (desktop e mobile) e fechar ou alternar aba para disparar o flush `keepalive`.
   - Conferir no Network do navegador `POST /api/observability/web-vitals` retornando `202` sem cookie/token clínico no payload.
   - Fazer login como `ADMIN`, acessar `/home` e validar o painel **Web Vitals em produção (RUM)** com filtros por dispositivo e rota.

## Rollback

Reverter o commit **`9cf2ad6`** (`git revert 9cf2ad6`) na branch `agent/codex/performance-diagnosis` e rebuildar API/Web. Não há migrations, variáveis obrigatórias ou dependências novas para remover.
