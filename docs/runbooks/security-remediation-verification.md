# Verificação da remediação de segurança

Data: 2026-10-02. Branch: `agent/codex/security-remediation`. Base revisada: `dcca5e591e9ebda2dd57fb94a40153af99355767`. Planos: [A](../superpowers/plans/2026-09-29-security-remediation-a-ownership-schema.md), [B](../superpowers/plans/2026-09-29-security-remediation-b-frontend-persistence-xss.md), [C](../superpowers/plans/2026-09-29-security-remediation-c-sessions-supply-chain.md), [D](../superpowers/plans/2026-09-29-security-remediation-d-operations-quality.md).

## Escopo e evidência

Todos os testes desta entrega usam dados sintéticos no PostgreSQL local de teste. Não houve push, merge, deploy nem acesso ao banco de produção. Schema e migrations necessários foram autorizados pelo mantenedor; migrations antigas permanecem intactas. A revisão independente da branch e do delta final terminou sem achados Critical, Important ou Minor pendentes. Os gates abaixo passaram na conclusão local de 2026-10-02; tarefa 4.8 concluída no worktree.

| Gate | Evidência obtida |
|------|-----------------|
| Prisma | Schema válido; 15 migrations; banco isolado atualizado |
| API | Strict typecheck, lint sem erros/warnings e build aprovados; 45 suítes/470 unitários; 20 suítes/102 E2E |
| Web | Typecheck e lint aprovados; 57 arquivos/368 testes; build de produção aprovado |
| HTML/CSP | Contrato exato e nonce por requisição nas 28/28 páginas servidas |
| Dependências runtime | API e web: 0 vulnerabilidades em `npm audit --omit=dev` |
| Schema privado | 40 tabelas com RLS; 40 policies restritivas; 0 grants atuais/default nas superfícies verificadas |
| Triggers de receitas | 3 funções invoker com `search_path=pg_catalog, public`; migration histórica preservada |
| Índices | 20 índices justificados; 15 testes reais de cobertura/planner; 17 FKs históricas residuais |
| Cypress configurado | 7 specs/17 testes aprovados; agenda desktop/mobile e conflito de versão preservados |
| Cypress real | 4 specs/14 testes aprovados: sessão, três profissões, lifecycle, isolamento, acessibilidade, avaliações, persistência, XSS e falhas de gravação |
| Imagens finais | API/web como UID 1000, sem dev packages/arquivos de ambiente; migration job separado aprovado no banco de teste |
| Smoke em containers | API/web/proxy saudáveis; privado sem sessão retorna 401; assets 200, CSP por nonce e três cookies Secure/HttpOnly com paths corretos |

## Achados e regressões

Os números correspondem à [especificação aprovada](../superpowers/specs/2026-09-29-security-remediation-design.md). Os commits indicam o núcleo de cada correção; as tarefas têm commits complementares de integração e testes.

| # | Correção | Regressão principal | Commits |
|---|----------|---------------------|---------|
| 1 | Perfil próprio e overview por Client | Users service/controller; matriz HTTP de ownership | `b59f947` |
| 2 | Rotas clínicas isoladas por profissional e Client | `client-owned-clinical-resources.e2e-spec.ts`, ownership dos services | `7703329`–`36e8506`, `db0fecc` |
| 3 | Substituição de planos transacional e serializada por Client | Rollback PostgreSQL de treinos/reabilitação; quatro criações concorrentes reais, incluindo importação de dieta | `7703329`, `d07d92a`, `d41c748` |
| 4 | Impressões escapadas e CSP por nonce | Builders/print-document; `clinical-persistence-security.cy.ts`; gate de HTML servido | `92706c5`, `d917c4a`, `8f8e760` |
| 5 | Persistência clínica na API, sem fallback local | Hooks e componentes; create/update/reload/delete e falha 500 no Cypress | `e821889`–`4330c1b`, `8f8e760` |
| 6 | Fisio persiste `PhysioAssessment` correto | Service/DTO/controller + jornada no prontuário | `5b24095` |
| 7 | JWT curto, refresh rotativo e revogação; coordenação entre abas | `auth-session.e2e-spec.ts`, `auth-session-schema.e2e-spec.ts`, Cypress de sessão; duas instâncias do API client com Web Locks | `c6c1527`–`8fc3d32`, `833c2d0`, `06ca344` |
| 8 | Cookies Secure obrigatórios em produção | Auth cookie policies, fronteiras set/clear, CSRF e sessão real | `8fc3d32` |
| 9 | Dependências corrigidas e imagens somente runtime | Audits; validator standalone; smokes de imagens e job de migration | `5f140be`, `a6b2e52` |
| 10 | DTOs e tipos estritos | Validação aninhada/ownership HTTP; `strict-type-contracts.spec.ts` e compiler | `7703329`–`36e8506`, `c79a483` |
| 11 | Client separado de identidade User | `client-owned-schema.e2e-spec.ts`, backfill e Cypress clínico | `8f2c26b`, `db0fecc` |
| 12 | Cron por Client, atomicidade e exclusão mútua | `alerts-cron.e2e-spec.ts`: falha de leitura/escrita, concorrência e owner incompatível | `74e82ca` |
| 13 | Autenticação global e runtime legado retirado | `global-auth.e2e-spec.ts`, AppModule runtime e domínios HTTP | `916d8fa`, `ec1c9b8` |
| 14 | Search paths imutáveis das funções | `database-security.e2e-spec.ts`, hash da migration histórica | `f6ee173` |
| 15 | Índices de queries e FKs atuais | `client-owned-indexes.e2e-spec.ts`; inventário de FKs e EXPLAIN | `ed82150` |

O gate genérico de todas as tabelas detectou ainda a exceção histórica de `consultation_notes`. A migration aditiva `20261001130000_harden_consultation_notes_data_api` fecha essa exceção e o teste agora cobre as 40 tabelas, sem alterar dados.

A revisão final encontrou duas condições de concorrência. As criações de treino, reabilitação, dieta e importação de dieta agora bloqueiam a linha do Client dentro da transação, antes de substituir o plano ativo. O navegador usa Web Locks do mesmo origin para consultar a sessão novamente antes de rotacionar o refresh, evitando replay acidental por outra aba. O fallback de navegadores sem Web Locks conserva apenas a exclusão por aba; esse ambiente não recebeu validação entre abas.

No Cypress, o fixture de edição passou a responder também à consulta de avaliações: o GET real sem cookies causava 401/logout e removia o formulário. A agenda mantém o cabeçalho e o fechamento fora do corpo rolável. As verificações de snapshot, conflito, confirmação e limites da tela permanecem; nenhum force-click, timeout ou supressão foi adicionado para ocultar essas falhas.

As jornadas reais de metas, laudos e pedidos selecionam o Client pelo ID do fixture antes de preencher cada formulário (`19744f8`). Isso mantém os testes válidos quando a jornada anterior cria outros clientes, sem depender da ordenação da carteira. O ID do Client salvo é verificado na resposta, além das verificações de ownership e ausência de identidades internas no payload. A correção da rolagem e o fixture completo do prontuário estão em `5c9007f`.

## Reprodução local em PowerShell

Use um checkout isolado, dependências dos lockfiles e nenhum arquivo de credenciais real. O banco abaixo é exclusivamente de teste e seu conteúdo é descartável. Execute cada comando verificando o exit code antes do seguinte.

```powershell
docker compose -f docker-compose.test.yml up -d
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$env:DIRECT_URL=$env:DATABASE_URL
$env:JWT_SECRET='test-only-security-remediation-2026'
$env:ALLOWED_ORIGINS='http://localhost:3001'
$env:AUTH_COOKIE_SECURE='false'
$env:AUTH_COOKIE_SAME_SITE='lax'
$env:NODE_ENV='test'
$env:TZ='UTC'
Set-Location api
npm.cmd ci
node node_modules/prisma/build/index.js validate
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js migrate status
node node_modules/prisma/build/index.js generate
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm.cmd run lint -- --no-fix
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd run seed:phase1-e2e
node dist/src/main.js
```

Os testes destrutivos de atomicidade e sessão criam bancos aleatórios guardados em `localhost:5434`, reaplicam migrations e removem esses bancos no teardown. Nunca retire as verificações de host, porta e nome. O fixture público usa somente identidades `@e2e.test` e valores sintéticos.

Em outro terminal, na pasta `web`, execute:

```powershell
$env:INTERNAL_API_URL='http://localhost:3000'
npm.cmd ci --legacy-peer-deps
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
New-Item -ItemType Directory -Force .next/standalone/public | Out-Null
Copy-Item -Path public/* -Destination .next/standalone/public -Recurse -Force
New-Item -ItemType Directory -Force .next/standalone/.next/static | Out-Null
Copy-Item -Path .next/static/* -Destination .next/standalone/.next/static -Recurse -Force
$env:PORT='3001'
$env:HOSTNAME='127.0.0.1'
node .next/standalone/server.js
```

O pós-build testa as 28 páginas reais e rejeita dev packages/arquivos de ambiente no standalone. Em um terceiro terminal `web`, rode primeiro as regressões e depois as duas suítes configuradas, sequencialmente:

```powershell
node node_modules/cypress/bin/cypress run --browser electron --spec cypress/e2e/client-owned-clinical-resources.cy.ts,cypress/e2e/clinical-persistence-security.cy.ts,cypress/e2e/auth-session-security.cy.ts
npm.cmd run e2e
npm.cmd run e2e:real
```

Não use force-click, aumento de timeouts ou supressões para fazer os gates passarem. A configuração não captura screenshots nem vídeo; inspeção visual é necessária apenas se houver falha de layout.

## Imagens e operação

Na raiz, builds locais:

```powershell
docker build --target production -t safemove-api-security .
docker build --target migration -t safemove-api-migration-security .
docker build -t safemove-web-security web
```

A API final roda `node dist/src/main.js` como `node`, sem Prisma CLI, Nest CLI ou TypeScript. O target `migration` mantém as ferramentas necessárias para `prisma migrate deploy`. A web contém standalone, public e assets, sem Cypress/Vitest/ESLint/TypeScript. Auditar o lockfile não substitui inspecionar os pacotes presentes em cada imagem final.

O [Compose runtime](../../docker-compose.runtime.yml) usa banco externo, configuração explícita, job de migration antes da API e web ligada à API saudável. Os ports são loopback; HTTPS deve terminar em proxy configurado com a origem presente em `ALLOWED_ORIGINS`. `AUTH_COOKIE_SECURE=true` é fixo nessa configuração. O Compose antigo exige revisão humana para alteração e permanece fora deste fluxo.

Para smokes locais das imagens, use somente `host.docker.internal:5434/ecossistema_resiliencia_test`, chave sintética e nomes/portas de containers temporários. O teste de sessão em HTTP usa os processos locais com `NODE_ENV=test`; não enfraqueça cookies de produção para viabilizá-lo.

Imagens locais verificadas em 2026-10-02 (tags `:20261002`):

| Imagem | ID local | Usuário |
|--------|----------|---------|
| `safemove-api-security-final` | `sha256:c4ba08ad3d11b9e6baf2f74e3b387371a005ef3eb7112003e3ef7e7dd22fd6ac` | `node`, UID 1000 |
| `safemove-migration-security-final` | `sha256:5406e887bd81bf74fa82c23a0990651b25c912c923302e0181b7fa6312d40ad5` | Padrão do builder; job descartável separado |
| `safemove-web-security-final` | `sha256:5cae5de7729a67cf65653068d2bad8b6de47d3c2181448a01a034acd5b12263c` | `node`, UID 1000 |

Nenhuma dessas imagens foi enviada a um registry. O login via proxy preservou os três cookies Secure/HttpOnly e os paths `/`, `/` e `/api/auth`. Os probes HTTP conferem headers e contratos; não substituem a validação HTTPS de produção.

## Advisors e limites residuais

O teste `database-security.e2e-spec.ts` verifica RLS/policies, ausência de privilégios em tabelas/sequences/functions e default ACLs, comportamento invoker e paths das três funções de receitas. `client-owned-indexes.e2e-spec.ts` verifica índices reais e elegibilidade do planner; não promete que o planner escolha o índice numa tabela pequena. Essas consultas retornam metadados, não dados clínicos. Esta entrega não consultou o advisor remoto.

O inventário local passou de 34 para 17 FKs sem índice de prefixo. Permanecem referências históricas sem consumidor montado: anamneses.patientId, diet_plans.userId, lab_exams.patientId, meal_logs.mealId, patient_alerts.patientId, patient_consents.professionalId, physical_assessments.userId, physio_assessments.userId, professional_patient_links.patientId, rehab_plans.userId, supplement_plans.patientId, workout_log_sets.exerciseId/logId, workout_logs.splitId/workoutId e workouts.userId. A referência meal_items.recipeVersionId aponta a uma versão imutável, sem consulta reversa/remoção no runtime. Reavaliar índices ao criar consumidores ou permitir alterações dessas entidades.

Os audits de runtime estão limpos. Advisories apenas de desenvolvimento permanecem fora das imagens finais; atualizar tooling exige trabalho próprio. O ts-jest também conserva seu aviso sobre módulos híbridos; os testes encerram normalmente. CSP permite estilos inline do Radix e `unsafe-eval` apenas em desenvolvimento; scripts inline não são liberados em produção.

## Ordem das migrations e recuperação

A sequência nova, após o baseline já versionado, é:

1. `20260929120000_add_client_owned_clinical_resources` — ownership/backfill e persistência de metas/pedidos.
2. `20260929123000_add_revocable_auth_sessions` — sessões, hash de refresh e authVersion.
3. `20260929130000_harden_recipe_function_search_paths` — ALTER das três funções existentes.
4. `20260929133000_index_client_owned_foreign_keys` — índices alinhados ao schema.
5. `20261001130000_harden_consultation_notes_data_api` — RLS defensivo das notas.

Antes de publicar: revisar backup, destino e migration status; aplicar com conexão direta no target dedicado; verificar metadados/grants; iniciar API e web; validar origem, HTTPS, cookie paths, refresh/logout e isolamento com contas de teste autorizadas. Esses passos de produção não foram executados nesta entrega.

A recuperação mantém dados históricos e novas tabelas/colunas aditivas. Não edite migrations aplicadas, não use `migrate reset` em produção e não remova RLS/grants para recuperar serviço. Prefira restauração do backup aprovado ou migration corretiva para frente. Reverter a API para endpoints vulneráveis não é um rollback aceitável; conserve guards e ownership. Tokens antigos exigem novo login; em incidente, incremente authVersion/revogue sessões pela operação interna aprovada. Cookie Secure, origem e path precisam continuar coerentes durante qualquer reversão da web.
