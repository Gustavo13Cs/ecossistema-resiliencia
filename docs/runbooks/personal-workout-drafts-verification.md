# Verificação de rascunhos e revisões Personal

Esta jornada usa web/API em build de produção e PostgreSQL16 sintético, com autenticação por cookies HttpOnly, CSRF e conexões de runtime sem privilégios administrativos. O salvamento é manual.

## Pré-requisitos e isolamento

- Banco exclusivo `ecossistema_resiliencia_test` em `localhost:5434`, migrations locais aplicadas. `assertIsolationDatabase` exige os dois URLs locais exatos antes de qualquer fixture privilegiada; o runner recusa portas3000/3001 ocupadas.
- `npm`/`npx` no PATH; comandos Windows passam por `cmd.exe` somente em win32. Os testes puros em `api/test/personal-real-runner-options.spec.ts` cobrem Linux/Windows, seleção default e `--spec`.
- O seed possui Personal A e B. A limpeza específica do browser remove apenas os clientes `Task7 ` do Personal A sintético e seus drafts/workouts/audit events, nessa ordem. Não usar o helper contra outra base nem executar suites PostgreSQL concorrendo com esse runner.
- Ao repetir o seed, eventos de agendamento dos cinco profissionais sintéticos são removidos antes de seus agendamentos, respeitando a FK `appointment_events_appointmentId_fkey`. O guard do banco local é executado antes de abrir o Pool.
- A API filha recebe somente URLs das roles clinical/auth/jobs. URLs administrativos são exclusivos de migrations/fixtures. O cleanup encerra apenas processos iniciados pelo runner e restaura o ambiente de roles.

## Comandos

Na pasta `api`, o contrato público é:

```sh
TZ=America/Fortaleza npx ts-node test/run-personal-p1-real.ts --spec cypress/e2e/personal-workout-drafts-real.cy.ts
```

Sem `--spec`, permanecem os quatro specs P1: personal-workspace-real, professional-phase1-real, assessments-client-real e client-owned-clinical-resources. Para o lote combinado, iniciar por professional-phase1-real, depois personal-workspace-real, assessments-client-real, client-owned-clinical-resources e personal-workout-drafts-real. Essa ordem evita acumular logins reais no início do lote. Os testes P1 já possuem aguardas de61s; o novo spec aguarda também61s antes da prova CDP final, pois cada documento resolve `/auth/me` e essa rota permite60 requisições/min/IP. É espaçamento explícito da carga de teste: throttler, timeouts das asserções e retries permanecem intactos.

Neste worktree, `node_modules` é um symlink para o repo-base. O Turbopack16 recusou o destino fora da raiz inferida; o runner usa `npm run build -- --webpack`, incluindo TypeScript e os dois postbuild guards. Não houve alteração de Next config, dependências ou TLS.

O host não possui Xvfb. Foi utilizada a imagem oficial já instalada `cypress/included:15.14.2`, digest `sha256:9f27bf8330595fe44dc3ba9c0c96cff1618d24241bd9f95a470f8f6e2ecfba7e`, sem download adicional. Execução Docker efetiva, com rede concedida ao comando:

```sh
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
docker --host=unix:///var/run/docker.sock run --rm --user 1000:1000 \
  --network safemove-personal-test_default --add-host safemove-db-host:host-gateway \
  --mount type=bind,src=/workspace,dst=/workspace \
  --mount type=bind,src=/etc/ssl/certs/ca-certificates.crt,dst=/run/proxy-ca.pem,readonly \
  --workdir /workspace/ecossistema-resiliencia/.worktrees/personal-workout-implementation/api \
  --env TZ=America/Fortaleza --env NODE_EXTRA_CA_CERTS=/run/proxy-ca.pem \
  --entrypoint node cypress/included:15.14.2 \
  /workspace/ecossistema-resiliencia/.worktrees/personal-workout-implementation/.superpowers/artifacts/personal-workout-drafts/browser-container-bootstrap.cjs \
  node -r ts-node/register test/run-personal-p1-real.ts \
  --spec cypress/e2e/professional-phase1-real.cy.ts,cypress/e2e/personal-workspace-real.cy.ts,cypress/e2e/assessments-client-real.cy.ts,cypress/e2e/client-owned-clinical-resources.cy.ts,cypress/e2e/personal-workout-drafts-real.cy.ts
```

O bootstrap faz somente o encaminhamento fixo local5434 para o DB sintético. A CA pública é montada read-only porque next/font apresentou `SELF_SIGNED_CERT_IN_CHAIN` sem ela. Proxies e verificação TLS permanecem ativos.

## Cobertura de navegador

O novo spec não substitui os serviços principais. Cria aluno na UI, salva incompleto, recarrega, completa, finaliza, revisa por ID e lê as duas fichas, incluindo o vínculo de origem e os estados ativo/anterior. Cobre concorrência em outra aba real, mudança da base após abrir a confirmação, versão de rebase, arquivamento read-only, terminais, conta B e 403/Voltar.

As falhas503 são injetadas apenas depois de o serviço real responder200/201. A gravação ocorre no banco e a UI precisa preservar texto dirty, snapshot enviado e baseline; GET/retry e recuperação de finalize verificam o estado real. Não há `force` click, mock de identidade/domínio ou aumento de timeout no spec novo.

O Cypress roda em iframe, onde o navegador observado emitiu traversal sameDocument com `cancelable:false`, mesmo após ativação real. As provas de cancelamento de Back repetido, Forward e salto foram transferidas para uma aba Chrome top-level via CDP. A modalidade SPA verifica o mesmo documento, evento cancelável, destinos reais e teclado/foco. A modalidade sem Navigation API remove essa API antes de cada documento e observa/responde ao diálogo nativo por CDP. Os browsers usam as mesmas sessões sintéticas, transferidas por stdin sem logar credenciais; só chamam os endpoints públicos normais, com CSRF real. Perfis temporários e filhos próprios são encerrados/limpos.

## Gates e evidências

Gates executados no worktree da implementação, após os últimos ajustes de produto. As rodadas de browser estão discriminadas separadamente abaixo.

| Gate | Resultado observado |
| --- | --- |
| API `npm test -- --runInBand` |54 suites,660 testes passaram; ts-jest151002 informativo pré-existente. O script define TZ=UTC. |
| API `npx tsc --noEmit` | exit0 |
| API `npx eslint "src/**/*.ts" "test/**/*.ts" --max-warnings=0` | exit0 após formatar somente os novos helpers/runner |
| API `npm run build` | build real do runner passou |
| API `npm run test:e2e` |35 suites,227 testes passaram,28,579s; `NODE_OPTIONS=--max-old-space-size=4096` no host8GiB |
| Web `TZ=America/Fortaleza npm test` |79 arquivos,601 testes passaram,111,65s, após todos os ajustes de produto |
| Web `npm run typecheck` e `npm run lint` | ambos exit0 |
| Web `INTERNAL_API_URL=http://localhost:3000 npm run build -- --webpack` | build do runner passou; inclui TypeScript,30/30 páginas com contrato/CSP e runtime standalone44 diretórios |
| Runner helper puro | RED7 falhas/3 passes→GREEN10/10 |
| Workspace/hook/editor após corrida e foco/cache | RED2 da corrida e RED2 foco/cache→GREEN72/72 em3 arquivos |

O primeiro PostgreSQL gate encontrou ausência do índice leadingClient e depois esgotou o heap padrão≈2GiB. A migration aditiva `20261017123000_workout_draft_client_index` corrigiu o índice sem editar migrations anteriores, permissões ou dados. A execução completa com heap4GiB manteve toda a cobertura.

Os logs locais foram preservados em `.superpowers/artifacts/personal-workout-drafts/implementation-evidence/`, fora de versionamento, após o fechamento do workspace temporário do plano. O relatório de execução e de revisão complementa esta tabela com hashes e limites de browser observados.


O gate PostgreSQL foi executado sequencialmente na pasta `api`, sem runner de browser concorrente:

```sh
TZ=America/Fortaleza NODE_OPTIONS=--max-old-space-size=4096 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
DIRECT_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
npm run test:e2e
```

## Rodadas de browser e limites observados

| Log local | Composição e resultado |
| --- | --- |
| `task-7-browser-seventh.log` | Novo spec8/9; todas as jornadas e as travessias SPA/nativas passaram. A precondição de retornar A em documento novo falhou no complemento CDP. |
| `task-7-browser-session-targeted.log` | Prova session-back direcionada1/1,15s: com403 e sem403 anterior. Spec temporário removido. |
| `task-7-browser-final.log` | Cinco specs,26/28: professional10/10, Personal0/1, assessments1/1, contrato7/7, novo8/9. Personal ainda buscava campo avançado recolhido; no último CDP o serviço retornou `/auth/me`429. Esse lote não foi inteiramente verde. |
| `task-7-browser-personal-targeted.log` | Personal corrigido1/1,96,191s, exit0, com todos os asserts de histórico/arquivo/conta B. |
| `task-7-browser-drafts-paced.log` | Novo spec8/9: a prova session-back com pacing passou; o helper CDP nativo tentou ler o input do documento anterior durante `Page.reload`. Sem erro HTTP ou falha de produto observada. |
| `task-7-browser-drafts-final.log` | Novo spec **9/9**,2m04s,exit0. Seed repetido, builds API/web, SPA/CDP nativo, session-back e cleanup passaram;0 screenshots/vídeo. |

A regressão Personal recebeu apenas as etapas da UI atual (seletor zero/ativo, labelObjetivo, parâmetros avançados, Finalizar/confirmar e voltar do leitor), mantendo os valores, IDs históricos, arquivo e isolamento. O contrato clinical-resources já usava intercepts; seu caso de treino migrou POST legado para create/finalize e mantém `clientId`, ausência de autoridade externa e `expectedVersion`. O novo spec continua usando os serviços reais.

As provas top-level usaram Chrome/147.0.7727.137; o Cypress usou15.14.2/Electron138 e Node24.15.0. Tanto SPA quanto documento observaram2 Back,1 Forward e1 salto cancelados, mais3 destinos aceitos. SPA também comprovou Cancelar por teclado e retorno do foco ao input. A ausência da Navigation API foi aplicada antes de cada documento no modo fallback.

Todos os `pageshow.persisted` observados foramfalse. O CDP informou `MainResourceHasCacheControlNoStore`, `JsNetworkRequestReceivedCacheControlNoStoreResource`, `BrowsingInstanceNotSwapped` e `CacheControlNoStoreHTTPOnlyCookieModified` como motivos para não usar BFCache. Portanto, esta execução comprova as travessias reais observadas, sem afirmar restauração de BFCache nem cobertura universal de SSR/hidratação. O helper de seleção de comandos cobre win32; processos reais foram verificados somente no Linux. O complemento CDP precisa de `google-chrome` e Node com WebSocket nativo, presentes na imagem utilizada.

Foram feitas somente duas capturas finais, inspecionadas visualmente: `.superpowers/artifacts/personal-workout-drafts/task-7-desktop-1440x900.png` (editor) e `task-7-mobile-390x844.png` (leitor). Ambas são legíveis e sem overflow horizontal, também verificado no DOM. Foco/teclado são evidência CDP, não inferidos dessas imagens. Os artefatos locais não são versionados; Cypress não gerou screenshots nem vídeo.

As capturas são opt-in por `TASK7_FINAL_INSPECTIONS=1`. O helper cria `.superpowers/artifacts/personal-workout-drafts/` se necessário; a rodada final não ativou essa opção nem recapturou imagens. O primeiro retry do runner com pacing havia parado no seed por um `appointment_event` remanescente. A correção foi somente a ordem de cleanup restrita aos IDs sintéticos; o seed isolado e o seed repetido pelo runner final concluíram com exit0.

Os ajustes finais de produto se limitam à retenção do editor já bloqueado até consumir o ACK de finalize/discard, invalidação dos detalhes de workout somente no owner/aluno afetado e restauração do foco de origem do diálogo. As negações, trocas de contexto e terminais externos continuam desmontando o editor imediatamente. Os testes integrados reproduzem o refetch terminal antes da conclusão da mutation e verificam navegação e ausência de formulário utilizável depois da resposta.


## Fechamento da revisão ampla — 19/10/2026

A revisão ampla encontrou dois achados importantes: uma falha transitória posterior ao403 do treino ativo podia reabrir o editor com dados antigos, e a ação de reautenticação não encerrava a sessão nem levava à rota real de login. O commit `f052883` persiste a negação no marcador do contexto e reutiliza o logout existente, que limpa Auth/QueryClient e navega para `/auth/login`. A única rerevisão scoped aprovou os dois achados, sem novos achados.

Após a correção, os seis arquivos focados somaram97/97 testes; typecheck, lint e diff-check passaram. As duas jornadas reais de recuperação (SPA e documento) passaram, incluindo novo login e reabertura do mesmo rascunho. O lote direcionado foi2/3 por falha de sincronização do driver após Cancelar; a trilha de foco demonstrou que clear/type se sobrepunha à restauração assíncrona de foco do Radix. O spec passou a aguardar o diálogo ausente e o foco no opener, verificando campo vazio e texto exato; esse caso repetido passou5/5. Não há alegação de rodada integral9/9 posterior à correção. Logs e relatórios final-review, final-fix-report e final-rereview estão no arquivo local de evidências acima.

As nove decisões de execução e seu custo de revisão estão em [personal-workout-drafts-decisions.md](personal-workout-drafts-decisions.md). A branch e a worktree foram mantidas para executar a biblioteca visual já aprovada, sem publicação ou integração automática.
