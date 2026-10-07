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

O frontend acessa a API NestJS, sem acesso direto aos dados clínicos pelo Supabase. O hardening anterior protegeu 40 tabelas com RLS e policy restritiva `deny_data_api_access`, incluindo `consultation_notes`. A nova migration inclui duas tabelas de auditoria e mantém a Data API sem grants; policies negativas passam a um grupo sem consumidores para permitir o runtime clínico sem bypass. Revogam grants de PUBLIC e, quando existentes, `anon`, `authenticated` e `service_role`. `_prisma_migrations` é metadado do ORM e não integra essas 40 tabelas.

O histórico de 2026-09-16 registra a Data API de produção desabilitada e o hardening então aplicado. Esta entrega não verificou novamente o ambiente remoto nem aplicou migrations nele. O gate isolado verifica tabelas, sequences, funções e default ACLs sem retornar conteúdo clínico.

A conexão privilegiada do owner pode contornar RLS; ela não é aceita como credencial clínica desta implementação local. Policies por profissional complementam os filtros de ownership da API. Qualquer exposição futura precisa de grants mínimos e policies aprovadas; o JWT próprio não equivale a `auth.uid()` do Supabase.

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
| `DATABASE_URL` | Ferramentas/fixtures; não é fallback do runtime clínico |
| `DIRECT_URL` | Owner separado das migrations; segredo, somente servidor |
| `CLINICAL_DATABASE_URL` | LOGIN exclusivamente safemove_clinical |
| `AUTH_DATABASE_URL` | LOGIN exclusivamente safemove_auth |
| `JOBS_DATABASE_URL` | LOGIN exclusivamente safemove_jobs |
| `AUDIT_DELIVERY_DATABASE_URL` | LOGIN exclusivamente safemove_audit_delivery; worker separado |
| `CLINICAL_TRANSACTION_MAX_WAIT_MS` | 10000 padrão; inteiro entre 100 e 60000 |
| `CLINICAL_TRANSACTION_TIMEOUT_MS` | 30000 padrão; inteiro entre 100 e 120000 |
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

## Integridade do catálogo e preferências

Contrato local da branch `agent/codex/security-followup`, validado em 2026-10-05: criação comum aceita somente fonte MANUAL. Alimentos de fonte oficial não podem ser alterados/excluídos por nutricionistas. Food MANUAL ainda é compartilhado, sem proprietário no schema; após vínculo com qualquer dieta/modelo/receita, passa a ser imutável. Para corrigir nutrientes, cadastrar outro alimento. Registro manual sem referências continua editável/excluível por nutricionistas.

A atualização usa DTO concreto e projeção explícita de escalares; corpo HTTP não fornece operações Prisma ou relações. Verificação de referências e escrita usam transação/lock de linha, evitando novas referências entre as duas operações. Publicação de receita bloqueia os alimentos antes da leitura/cálculo para manter consistência do snapshot.

Preferências são lidas pela identidade autenticada, nunca pela identidade arbitrária da query. Compatibilidade legada só aceita a mesma identidade da sessão; quantidade deve ser finita e não negativa. A resposta usa no-store.

## Trilha de leitura e segunda camada no banco

Implementação local desta branch, aprovada pelo mantenedor: cada resposta clínica classificada grava ClientReadAuditEvent e audit_delivery_states na mesma transação que preparou a resposta. O interceptor aguarda o commit antes de liberar o resultado. Falha de persistência ou de contexto retorna erro genérico, sem conteúdo clínico; não existe fallback em modo sombra. A trilha não guarda nome, conteúdo clínico, IP, user-agent, credenciais ou tokens.

O principal vem da sessão validada e transporta sessionId internamente. requestId é gerado no servidor. Listas deduplicam Clients e gravam eventos em lotes de 100, com teto de 1000 linhas/Clients; amplitude maior é rejeitada integralmente. Todos os handlers HTTP montados exigem classificação explícita. Perfil, autenticação, saúde, catálogo e recursos privados sem Client têm exceções documentadas; modelos vinculados a Client continuam auditados.

PrismaService usa AsyncLocalStorage e TransactionClient; delegates/raw fora do contexto falham, e helpers aninhados reutilizam a conexão. Transações clínicas usam ReadCommitted; agenda declara Serializable. A identidade e os GUCs valem somente na transação. O papel clínico não lê senhas/auth_sessions nem atualiza password/authVersion/role. Auth e cron têm conexões distintas.

A nova migration habilita RLS nas 42 tabelas de aplicação e atribui políticas/grants mínimos a grupos NOLOGIN separados. Client e recursos clínicos exigem dono/autor; filhos herdam acesso pelo pai; modelos clientless exigem autor e isTemplate, sem userId legado. Registros históricos já vinculados a Client autorizado podem conservar userId; novas dietas gravam userId null. Legado sem Client não recebe fallback. ADMIN não tem bypass.

O runtime deve usar LOGINs sem superuser/BYPASSRLS, criação de papéis/bancos, replicação, ownership de tabelas ou mistura dos grupos de privilégios. A inicialização verifica current_user e session_user, flags e memberships/grupos; isso não substitui o inventário da Fase 0 nem a homologação do pooler real. O owner das migrations permanece separado; FORCE RLS é uma decisão operacional pendente.

Food continua compartilhado. A função food_in_use retorna somente um booleano e executa como grupo NOLOGIN sem bypass, com SELECT apenas dos foodIds de referências. O trigger adquire FOR UPDATE antes de revalidar referências, inclusive quando a FK é o único lock do escritor concorrente. Receitas conservam FOR SHARE durante leitura/cálculo do snapshot. O INSERT clínico aceita MANUAL e a fonte interna SAFE_MOVE_TEMPLATE para o fluxo existente; o DTO público permite somente MANUAL. Importação de fontes TACO/TBCA exige papel próprio.

A trilha permite INSERT e SELECT do próprio profissional, sem UPDATE/DELETE/TRUNCATE; triggers reforçam imutabilidade. sessionId não possui FK. Client/dono/ator usam Restrict. O cron restrito registra SYSTEM com alerts.daily e execução identificada, sem ator humano/sessão fictícios. Estado de entrega é separado da trilha e confirmado pelo token da reserva. A cópia usa contrato idempotente por eventId e ocorre depois do commit. O adaptador/destino independente efetivo ainda depende de D3.

A página /auditoria e GET /read-audit exibem somente a trilha do profissional autenticado, com paginação e cache em memória separado por sessão. A consulta também é auditada, sem recursão. Investigação transversal segue D7 e não foi concedida a ADMIN.

Esta entrega não foi aplicada em produção. Antes de publicar, concluir Fase 0, decisões D1–D10 aplicáveis, cópia independente, retenção/expurgo, monitoramento, restauração e homologação do pooler/carga. Os GUCs não são defesa contra SQL injection ou comprometimento do servidor.

O [roteiro operacional de auditoria/RLS](runbooks/read-audit-tenant-rls.md) registra os gates locais aprovados em PG16/17 e as decisões ainda necessárias para implantação.
