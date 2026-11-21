# Performance 20 — renderização inicial das páginas públicas

## Resultado

Alteração entregue no commit **`75aac62`** na branch `agent/codex/performance-diagnosis`, comparada ao baseline `58dc395`. Antes, o `AuthProvider` bloqueava todo `children` atrás do estado inicial de carregamento (`Carregando sua área profissional` / `Verificando sua sessão segura.`) inclusive nas rotas públicas (`/`, `/auth/login`, `/auth/register`), removendo o conteúdo real do HTML inicial de SSR e atrasando a pintura principal até a conclusão da verificação de sessão (`GET /auth/me` + tentativa de recuperação CSRF/refresh).

Com o isolamento centralizado de rotas públicas em [`web/lib/public-routes.ts`](../../web/lib/public-routes.ts), [`AuthProvider`](../../web/contexts/auth-context.tsx) passa a bloquear apenas:

1. rotas protegidas enquanto `isLoading` for `true`;
2. sessões com papel não reconhecido pela allowlist (`isInvalidRole`);
3. redirecionamentos administrativos fora de `/home` (`isAdminRedirecting`).

Nas páginas públicas (`/`, `/auth/login`, `/auth/register`), o HTML inicial de SSR agora entrega integralmente os headings, landmarks, links, textos e formulários públicos mantendo o mesmo `RootLayout`, nonce CSP por requisição e ordem do `DirectionContract`. As rotas protegidas (`/home`, `/clientes`, demais áreas clínicas) permanecem integralmente atrás da barreira inicial no SSR e durante a hidratação da sessão.

Escopo exclusivamente frontend (`web/`). Nenhuma mudança em `api/`, `schema.prisma`, migrations, políticas RLS, dependências ou deploy de produção.

## Mudanças aplicadas

| Arquivo | Antes | Depois |
|---|---|---|
| [`web/lib/public-routes.ts`](../../web/lib/public-routes.ts) | Conjunto de rotas públicas duplicado em `auth-context.tsx` e `LayoutWrapper.tsx` | Helper único `PUBLIC_ROUTES` / `isPublicRoute(pathname)` para `/`, `/auth/login` e `/auth/register` |
| [`web/contexts/auth-context.tsx`](../../web/contexts/auth-context.tsx) | `if (isLoading \|\| ...)` bloqueava também páginas públicas no SSR e no primeiro render; sem geração de sessão nem `AbortController` na hidratação | `shouldBlockContent = (!onPublicRoute && isLoading) \|\| isInvalidRole \|\| isAdminRedirecting`; adiciona `sessionGenerationRef`, `hydrateAbortRef` (`AbortController`) e `advanceAuthSessionEpoch()` para isolar login rápido de respostas obsoletas do `/auth/me` inicial |
| [`web/lib/api.ts`](../../web/lib/api.ts) | Interceptador de 401 em `/auth/me` disparava `/auth/csrf` -> `/auth/refresh` e limpava `csrfToken` mesmo após outro login ter assumido o estado em memória | Adiciona `authSessionEpoch`, `advanceAuthSessionEpoch()`, `_authEpoch` por requisição e `updateCsrfTokenIfCurrent()`, impedindo que recuperação 401/403 obsoleta sobrescreva ou zere o CSRF de uma sessão mais nova |
| [`web/components/LayoutWrapper.tsx`](../../web/components/LayoutWrapper.tsx) | Mantinha `PUBLIC_ROUTES` próprio | Passa a consumir `isPublicRoute(pathname)` compartilhado mantendo a barreira nula (`isLoading \|\| !user`) e o `AppShell` idênticos nas rotas protegidas |
| [`web/app/layout.tsx`](../../web/app/layout.tsx) | `<Toaster />` aninhado dentro de `<AuthProvider>` | `<Toaster />` movido para logo após `</QueryProvider>`, mantendo `DirectionContract` como primeiro elemento de `<body>` e preservando notificações entre transições de auth (como pós-cadastro) |
| [`web/contexts/auth-context.test.tsx`](../../web/contexts/auth-context.test.tsx) | 6 testes em rota protegida simulada | **18 testes** (+12 novos): SSR com `renderToStaticMarkup` para rotas públicas e protegidas, render imediato sem bloqueio em `/` e `/auth/login`, proteção contra race de 401 tardio no login, redirecionamento autenticado `/` -> `/home`, bloqueio sem leak para visitante anônimo e logout forçado de papel inválido |
| [`web/lib/api.test.ts`](../../web/lib/api.test.ts) | 19 testes de interceptadores | **21 testes** (+2 novos): garante que 401 tardio ou `/auth/refresh` obsoleto após novo `setCsrfToken` / `advanceAuthSessionEpoch` não disparem refresh nem apaguem CSRF ativo nem chamem `unauthorizedHandler` |
| [`web/app/layout.test.tsx`](../../web/app/layout.test.tsx) | Verificava `DirectionContract` e `<main>` | Passa a verificar também a presença ordenada do `<Toaster />` (`aside[data-root-layout-ui]`) após `<main>` |

## Comparativo Antes × Depois

### 1. HTML inicial de SSR (servidor Next.js de produção local)

Medido contra o handler de produção do Next.js **16.3.4 (Turbopack)** via `fetch()` e analisado com `JSDOM` sobre o HTML inicial devolvido antes de qualquer JavaScript do cliente:

| Rota | Tipo | HTML bytes (antes → depois) | Barreira de loading no HTML | Conteúdo principal no DOM inicial (antes → depois) | Nonce CSP 128-bit & `DirectionContract` |
|---|---|---|---|---|---|
| `/` | Pública | `28.198 → 39.420` | `presente → ausente` | `h1: null`, `header`/`nav`/`main`/`footer`/links/`<img>` `ausentes` → `h1: "Seu trabalho clínico, em uma base privada"`, todos os landmarks presentes | Preservados |
| `/auth/login` | Pública | `18.060 → 26.401` | `presente → ausente` | `h1: null`, `<form>`, `#email`, `#password`, `"Entrar"` `ausentes` → todos presentes (`h1: "Entrar no SafeMove"`) | Preservados |
| `/auth/register` | Pública | `18.066 → 28.230` | `presente → ausente` | `h1: null`, `<form>`, `radiogroup` (`NUTRITIONIST`, `PERSONAL`, `PHYSIO`), inputs `ausentes` → todos presentes (`h1: "Criar conta profissional"`) | Preservados |
| `/home` | Protegida | `17.569 → 17.703` | **`mantida presente`** | `h1: null`, zero conteúdo protegido (`hasProtectedLandmarks: false`) | Preservados |
| `/clientes` | Protegida | `17.576 → 17.710` | **`mantida presente`** | `h1: null`, zero conteúdo protegido (`hasProtectedLandmarks: false`) | Preservados |

*(Nota sobre `/` antes: o texto serializado de `<ProfessionalAreas />` aparecia apenas dentro das tags `<script nonce=...>` do payload RSC em `body.textContent`, enquanto o DOM HTML renderizado continha somente a tela `Carregando sua área profissional` sem `<h1>`, cabeçalho, navegação principal ou links visíveis.)*

### 2. Chrome headless local (FCP, LCP, CLS e hidratação)

Executado no Chrome local (`390×844`, cache desabilitado, 3 execuções por rota via CDP) com interceptação de `/api/*` simulando **250 ms** por requisição de auth (`GET /api/auth/me` → 401, `GET /api/auth/csrf` → 200, `POST /api/auth/refresh` → 401):

| Rota | FCP mediana (antes → depois) | LCP mediana (antes → depois) | Redução LCP local | CLS máx. | Hidratação / exceções / erros não-401 |
|---|---:|---:|---:|---:|---:|
| `/` | `144 ms → 152 ms` | **`1.324 ms → 152 ms`** | **−1.172 ms (−88,52%)** | `0 → 0` | `0 / 0 / 0` |
| `/auth/login` | `80 ms → 148 ms` | **`1.248 ms → 148 ms`** | **−1.100 ms (−88,14%)** | `0 → 0` | `0 / 0 / 0` |
| `/auth/register` | `88 ms → 136 ms` | **`1.276 ms → 136 ms`** | **−1.140 ms (−89,34%)** | `0 → 0` | `0 / 0 / 0` |

Em verificação adicional aguardando a conclusão completa de `POST /api/auth/refresh` (401) nas três rotas públicas no Chrome headless: todas mantiveram a rota atual, o respectivo `<h1>`, zero `<aside aria-label^="Área de">` indevido, **`CLS = 0`**, zero erros de hidratação e zero exceções JS.

**Limites da medição:** os tempos acima foram coletados localmente contra o servidor Next de produção local e mocks CDP com latência fixa simulada de 250 ms para os endpoints de auth. Demonstram determinismo na eliminação da dependência do waterfall de auth para a pintura inicial das páginas públicas no primeiro frame, mas não substituem Lighthouse, telemetria RUM nem medições na rede/API de produção.

### 3. Comportamento de sessão (Chrome headless + Vitest)

| Cenário | Resultado observado |
|---|---|
| Anônimo em `/`, `/auth/login`, `/auth/register` | Render imediato pelo SSR; `GET /api/auth/me` roda em segundo plano para detectar sessão pré-existente; após 401 no refresh, visitante permanece na página sem `CLS` nem erro de hidratação. |
| Autenticado (`NUTRITIONIST`) abrindo `/` ou `/auth/login` no Chrome | `GET /api/auth/me` retorna 200 e redireciona normalmente para `/home` (`finalPathname: "/home"`, área profissional carregada). |
| Anônimo abrindo `/clientes` no Chrome | Barreira inicial mantém conteúdo protegido oculto no SSR e durante verificação; após 401, redireciona para `/auth/login` sem renderizar dados nem landmarks internos. |
| Login rápido em `/auth/login` antes de `GET /auth/me` inicial terminar (Vitest) | `login()` aborta o pedido inicial e avança `authSessionEpoch` + `sessionGenerationRef`; quando o 401 obsoleto chega depois, usuário autenticado, cache e `X-CSRF-Token` da nova sessão permanecem íntegros. |
| Sessão com papel inválido (`UNKNOWN`) em `/clientes` e `/` (Vitest) | Bloqueia exibição do conteúdo, chama `POST /auth/logout`, limpa cache/CSRF e substitui rota para `/auth/login`. |

## Regressões e validação

- **Testes focados (`7` arquivos):** **7/7 arquivos, 65/65 testes aprovados** (`app/layout.test.tsx`, `lib/api-cross-tab.test.ts`, `lib/api.test.ts`, `components/auth/ReauthenticateButton.test.tsx`, `components/auth/ProfessionalRouteBoundary.test.tsx`, `contexts/auth-context.test.tsx`, `app/auth/auth-pages.test.tsx`).
- **Suíte completa `npm --prefix web test`:** **103/104 arquivos, 809/810 testes aprovados**.
  - **Única falha (pré-existente de ambiente Windows, não relacionada ao item 20):** `web/test/licensed-media-fixture.test.ts` (`Licensed media fixture SHA-256 mismatch`), causada por `core.autocrlf=true` convertendo `LF → CRLF` no checkout de `web/cypress/fixtures/exercise-demonstration/bench-press.svg`. Nenhuma fixture ou `.gitattributes` foi alterado fora do escopo.
- **`npm --prefix web run typecheck` (`tsc --noEmit --incremental false`):** aprovado (código 0).
- **`npm --prefix web run lint` (`eslint . --max-warnings=0`):** aprovado (código 0, 0 erros, 0 warnings).
- **`$env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build` (`postbuild`):** aprovado; `assert-direction-contract.mjs` validou **32/32 páginas** de produção (nonce CSP 128-bit único por requisição + `DirectionContract`); `assert-standalone-runtime.mjs` validou **297 diretórios** no artefato standalone sem pacotes de dev ou arquivos `.env`.
- **`git diff --check`:** aprovado (código 0).
- **Fora de escopo:** suítes `api/` e Cypress E2E completo contra PostgreSQL não foram reexecutados nesta etapa (sem alterações em backend/banco e sem Docker Postgres ativo no ambiente).

## Reprodução e conferência manual

1. Rodar regressões focadas e qualidade estática:
   ```powershell
   npm --prefix web test -- contexts/auth-context.test.tsx app/layout.test.tsx app/auth/auth-pages.test.tsx components/auth/ProfessionalRouteBoundary.test.tsx components/auth/ReauthenticateButton.test.tsx lib/api.test.ts lib/api-cross-tab.test.ts
   npm --prefix web run typecheck
   npm --prefix web run lint
   ```
2. Gerar build de produção com pós-build (`32/32` páginas + standalone):
   ```powershell
   $env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build
   ```
3. Subir o artefato standalone (ou inspecionar via script local) e conferir com `curl`/DevTools sem cookies de sessão:
   - `/` devolve `<h1>Seu trabalho clínico, em uma base privada</h1>` e links reais no HTML inicial (sem `"Carregando sua área profissional"`).
   - `/auth/login` e `/auth/register` devolvem seus formulários completos no HTML inicial.
   - `/clientes` e `/home` continuam devolvendo apenas `"Carregando sua área profissional"` no HTML inicial e redirecionam para `/auth/login` quando não autenticados.
   - Com usuário autenticado abrindo `/`, o workspace redireciona automaticamente para `/home`.

## Rollback

Reverter o commit **`75aac62`** (`git revert 75aac62`) e gerar novo build. Não há migrations, variáveis de ambiente, mudanças de API ou dependências envolvidas.
