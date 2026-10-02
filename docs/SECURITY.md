# Segurança — SafeMove

Atualizado em 2026-10-02. A evidência desta remediação é local; o código entregue não confirma aplicação de migrations em produção. Consulte o [runbook de verificação](runbooks/security-remediation-verification.md).

## Autenticação e sessões

Senhas usam bcrypt com 12 rounds. O registro profissional cria a conta; o login cria uma `AuthSession` no PostgreSQL. O access JWT dura 15 minutos e contém `{ sub, jti, authVersion }`; o papel e a identidade atuais são carregados do banco em cada validação. Sessões expiradas/revogadas e versões de autenticação divergentes retornam 401.

O refresh token opaco possui entropia de 256 bits e validade fixa de 30 dias a partir da criação da sessão. Somente seu hash SHA-256 é persistido. A renovação troca esse hash atomicamente e mantém a expiração original. Reutilizar um token anterior revoga a sessão; o logout também revoga no servidor. Mudança de papel ou credenciais incrementa `authVersion` e revoga as sessões na mesma transação.

O cliente web coordena uma única renovação por aba e usa Web Locks para serializar renovações entre abas da mesma origem. Após adquirir o lock, consulta a sessão para aproveitar cookies já renovados por outra aba. Web Locks está disponível em HTTPS e localhost; sem essa API, permanece a coordenação na mesma aba. Uma requisição comum é repetida no máximo uma vez. Uma falha definitiva encerra a sessão e limpa os caches de usuário e dados clínicos.

| Cookie | Validade | Path padrão | Atributos |
|--------|----------|-------------|-----------|
| `access_token` | 15 minutos | `/` | HttpOnly, Secure configurado, SameSite configurado |
| `refresh_token` | Tempo restante da sessão, até 30 dias | `/api/auth` | HttpOnly, mesmos Secure/SameSite/Domain |
| `csrf_token` | 30 dias | `/` | HttpOnly, mesmos Secure/SameSite/Domain |

A aplicação exige `AUTH_COOKIE_SECURE=true` em produção; ausência ou `false` impede o bootstrap. `SameSite=None` também exige Secure. O path de refresh padrão corresponde ao proxy same-origin `/api/auth` da web. Um consumidor que acesse a API diretamente deve configurar `AUTH_REFRESH_COOKIE_PATH=/auth`. Criação e remoção dos cookies usam o mesmo Domain, Path, Secure e SameSite.

## CSRF, origens e autorização

Mutações autenticadas por cookie exigem uma origem presente em `ALLOWED_ORIGINS` e um par válido cookie/header `X-CSRF-Token`. `GET /auth/csrf` fornece o token ao cliente, sem expor credenciais. Login e registro exigem origem permitida; refresh e logout exigem também o par CSRF mesmo quando o access JWT expirou. Mutações comuns autenticadas somente por Bearer continuam suportadas.

O `JwtAuthGuard` está registrado globalmente via `APP_GUARD`: uma rota nova é privada por padrão. Apenas health checks, login, registro, bootstrap CSRF, refresh e logout são públicos; estes últimos possuem suas próprias verificações de credenciais e origem. `@Public()` não desabilita o throttling. O limite global é 60 requisições/minuto por IP e o login possui limite de 5/minuto.

Guards de papel restringem domínios a `NUTRITIONIST`, `PERSONAL` ou `PHYSIO`. `ADMIN` não contorna ownership. A identidade disponível em `AuthenticatedRequest.user.sub` vem da validação de sessão no banco. O papel legado `PATIENT` não recebe acesso aos prontuários profissionais.

## Isolamento por Client

`User` é a identidade autenticável; `Client` é o prontuário privado, sem login. Toda operação clínica resolve o Client com `professionalId` derivado da sessão. Recursos alheios retornam 404. DTOs não aceitam substituir proprietário, autor, paciente legado ou identificadores internos de recursos aninhados.

Treinos, reabilitações, avaliações fisioterapêuticas, anamneses, notas, suplementos e exames usam Client e autor profissional. Metas e pedidos laboratoriais são persistidos pela API. Substituição de plano ativo e criação dos seus filhos ocorrem em uma transação: uma falha mantém o plano anterior. Treinos, reabilitações e os dois caminhos de criação de dietas travam o Client pertencente ao profissional dentro dessa transação, impedindo dois planos ativos em criações simultâneas. Avaliações físicas e dietas conservam apenas compatibilidade de leitura legada com vínculo de ownership comprovado.

`ClientAccessService` e filtros de queries implementam o acesso; não existe um bypass administrativo. Novos endpoints precisam preservar também a autorização do domínio. Módulos antigos de agenda diária, métricas de paciente, consentimentos, check-ins e logs de paciente não estão montados no runtime. Tabelas e linhas históricas permanecem preservadas.

Alertas de treino consideram somente Clients ativos de contas PERSONAL, com tracking filtrado pelo mesmo profissional e Client. O cron calcula e substitui os alertas de Client numa transação protegida por advisory lock. Uma falha preserva o snapshot anterior; duas instâncias não duplicam o resultado. Alertas antigos de Patient são históricos e não aparecem no dashboard. Logs do cron contêm apenas contagens.

## Defesa da Data API

O frontend acessa a API NestJS, sem acesso direto aos dados clínicos pelo Supabase. As migrations desta branch deixam as 40 tabelas de aplicação com RLS e policy restritiva `deny_data_api_access`, incluindo `consultation_notes`. Revogam grants de PUBLIC e, quando existentes, `anon`, `authenticated` e `service_role`. `_prisma_migrations` é metadado do ORM e não integra essas 40 tabelas.

O histórico de 2026-09-16 registra a Data API de produção desabilitada e o hardening então aplicado. Esta entrega não verificou novamente o ambiente remoto nem aplicou migrations nele. O gate isolado verifica tabelas, sequences, funções e default ACLs sem retornar conteúdo clínico.

A conexão Prisma privilegiada pode contornar RLS. Portanto, RLS defensivo protege a superfície Data API e não substitui os filtros de ownership da API. Qualquer exposição futura precisa de grants mínimos e policies aprovadas; o JWT próprio não equivale a `auth.uid()` do Supabase.

As três funções dos triggers de receitas fixam `search_path=pg_catalog, public`, preservando corpo, ownership e comportamento invoker. Índices acompanham os filtros de Client, autor, estado e ordenação reais. As 17 FKs históricas sem consumidor atual estão justificadas no runbook; não foram indexadas apenas para eliminar avisos do advisor.

## Validação, impressão e armazenamento

`ValidationPipe` usa `whitelist`, `forbidNonWhitelisted` e `transform`. Campos desconhecidos são rejeitados. DTOs validam UUIDs, enums, datas, limites numéricos e objetos aninhados. `class-transformer` transforma valores e não é sanitizador HTML. TypeScript strict permanece obrigatório, sem `any` ou assinatura ampla no PrismaService.

Todos os builders de impressão escapam valores de texto, título e números antes de gerar HTML. A impressão usa um writer compartilhado, remove `opener` e aguarda o carregamento antes de imprimir; não injeta scripts inline. O CSP de produção usa nonce de 128 bits por requisição e não permite `unsafe-inline` ou `unsafe-eval` em scripts. Os scripts do framework recebem o mesmo nonce. Isso exige renderização dinâmica; não habilite cache compartilhado de HTML com nonce reutilizado.

Estilos inline permanecem permitidos para componentes Radix. `unsafe-eval` em scripts existe somente no modo de desenvolvimento. Essas concessões não liberam scripts inline na impressão.

Dados clínicos não são persistidos em localStorage/sessionStorage. Chaves clínicas legadas são descartadas sem recuperar seu conteúdo. O cache TanStack Query fica em memória e é isolado por sessão/Client. Falhas HTTP preservam o estado anterior e rascunhos em memória; não geram dados fictícios, seeds ou upload PDF simulado. Respostas clínicas relevantes usam `Cache-Control: no-store`.

Nunca registre dados clínicos, credenciais ou tokens em logs. Nunca retorne hashes de senha. Não versione arquivos `.env`, gravações com dados reais ou chaves. Imagens finais contêm somente runtime: a API inicia o JavaScript compilado; Prisma CLI fica no target separado `migration`, e a web executa o output standalone como usuário não-root.

## Configuração

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Conexão da API; segredo, somente servidor |
| `DIRECT_URL` | Conexão direta das migrations; segredo, somente servidor |
| `JWT_SECRET` | Assinatura dos access JWTs; segredo |
| `ALLOWED_ORIGINS` | Lista separada por vírgulas de origens permitidas, incluindo a origem da web |
| `AUTH_COOKIE_SECURE` | `true` obrigatório em produção |
| `AUTH_COOKIE_SAME_SITE` | `lax` padrão; `strict` ou `none` explícitos |
| `AUTH_COOKIE_DOMAIN` | Opcional; omitir produz cookie restrito ao host |
| `AUTH_REFRESH_COOKIE_PATH` | `/api/auth` padrão; `/auth` para acesso direto à API |
| `INTERNAL_API_URL` | Destino privado do proxy Next.js, necessário no build; não é variável pública |
| `NODE_ENV` | Seleciona as regras de produção/desenvolvimento |
| `TZ` | Fuso do processo, UTC recomendado |

A publicação exige migrations aplicadas antes de iniciar a API, HTTPS para cookies Secure e correspondência entre proxy, origem e paths. O [runbook](runbooks/security-remediation-verification.md) documenta a ordem, validação isolada e recuperação.
