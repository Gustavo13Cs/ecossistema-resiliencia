# Operação da auditoria de leitura e RLS por profissional

> Documento histórico. O mantenedor solicitou retirar Histórico de acessos em 2026-10-08; consulte [a remoção vigente](remove-access-history.md). A proteção RLS/contexto continua vigente.

Entrega local da proposta v3 no worktree security-followup. Este roteiro não autoriza deploy, DDL remoto, troca de credenciais ou publicação. A Fase 0 e a aprovação operacional continuam obrigatórias.

## Comportamento implementado

Uma resposta clínica classificada só é enviada depois do commit de sua transação, incluindo ClientReadAuditEvent e o estado inicial de entrega. Mutações que retornam conteúdo clínico participam da mesma fronteira. Se o registro falhar, a alteração clínica é revertida e o conteúdo não é liberado. Autenticação e perfil próprio, health, catálogo e modelos privados sem Client possuem exceções explícitas; modelos vinculados a Client são auditados. Novo handler montado sem classificação impede o bootstrap.

A identidade humana e sessionId vêm da sessão validada; requestId é gerado no servidor. A trilha não armazena nomes, notas, diagnósticos, tokens, IP ou user-agent. Leituras de listas deduplicam Clients, com lotes de 100 e teto de 1000 linhas/Clients; a resposta ampla é rejeitada por inteiro. Consultas legadas ainda podem materializar linhas antes desse limite: homologar e paginar conforme o volume real.

PrismaService exige contexto AsyncLocalStorage com TransactionClient ativo. Helpers aninhados reutilizam a transação; delegates e raw não têm fallback à conexão raiz. ReadCommitted é o padrão e a agenda declara Serializable. O escopo expira após commit/rollback. As variáveis locais de identidade não persistem fora da transação.

RLS cobre as 42 tabelas de aplicação. Client e recursos exigem o proprietário/autor; filhos seguem o pai; templates sem Client exigem autor, isTemplate e ausência de userId legado. Recursos históricos já vinculados a Client autorizado podem conservar userId; novas dietas gravam null. Não há fallback clínico por Patient nem bypass de ADMIN.

Food permanece compartilhado. Food oficial ou usado em qualquer dieta/modelo/receita é imutável. A função limitada food_in_use consulta somente IDs de referência e retorna um booleano. O trigger obtém FOR UPDATE antes de verificar referências, protegendo também o INSERT concorrente que usa apenas o lock da FK. O cálculo de receita mantém FOR SHARE durante a leitura dos nutrientes. O DTO comum aceita apenas MANUAL; o papel clínico também permite a fonte interna SAFE_MOVE_TEMPLATE para o fluxo já existente. TACO/TBCA exigem autoridade distinta.

O cron usa papel separado e registra SYSTEM/alerts.daily, execução identificada e dono real do Client, sem ator humano ou sessão fictícios. A página /auditoria consulta somente a trilha da própria conta, com paginação/filtro e cache em memória separado por identidade. Não mostra sessionId; nenhum dado da trilha é persistido no armazenamento do navegador. Filtro de Client alheio produz lista vazia, como ID desconhecido; cursor alheio produz 404.

## Papéis e configuração

A migration cria grupos NOLOGIN; não cria LOGINs nem senhas de produção.

| Uso | Grupo único | Variável |
|---|---|---|
| Clínica HTTP | safemove_clinical | CLINICAL_DATABASE_URL |
| Autenticação e sessões | safemove_auth | AUTH_DATABASE_URL |
| Cron de alertas | safemove_jobs | JOBS_DATABASE_URL |
| Entrega independente | safemove_audit_delivery | AUDIT_DELIVERY_DATABASE_URL |
| Booleano global do catálogo | safemove_catalog_lookup, NOLOGIN | Nenhuma conexão da aplicação |
| Owner de migration | Separado do runtime | DIRECT_URL |

O LOGIN de cada runtime deve herdar somente o grupo correspondente. Não pode ser superuser, BYPASSRLS, CREATEROLE, CREATEDB, REPLICATION, owner de tabelas, membro de papel privilegiado ou de outro grupo SafeMove. A inicialização verifica current_user e session_user, incluindo MEMBER e USAGE: SET ROLE não torna segura uma sessão iniciada com owner. O auth recebe INSERT de authVersion porque o Prisma materializa seu default no cadastro; esse papel já possui UPDATE da coluna para revogação. Isso não concede authVersion ao runtime clínico.

DATABASE_URL não é fallback de clínica/auth/jobs. DIRECT_URL não deve ser fornecido ao processo HTTP de produção. O worker usa sua própria conexão e assertDatabaseRole. CLINICAL_TRANSACTION_MAX_WAIT_MS: padrão 10000, intervalo 100–60000. CLINICAL_TRANSACTION_TIMEOUT_MS: padrão 30000, intervalo 100–120000. Valores inválidos impedem a inicialização. Dimensionar conexões, timeouts e pooler em staging, considerando os papéis separados.

As FKs de Client/dono/ator e entrega usam DELETE Restrict e UPDATE NoAction. sessionId não tem FK. Triggers e ausência de grants bloqueiam UPDATE/DELETE/TRUNCATE da trilha. Imutabilidade no runtime não impede um DBA/owner de alterar o banco.

## Antes de implantar

1. Concluir a Fase 0 no processo publicado: identidade efetiva, flags, memberships transitivas, ownership, possibilidade de SET ROLE e tipo/configuração do pooler. Coletar somente metadados; não imprimir DSNs, segredos ou conteúdo clínico.
2. Fechar decisões aplicáveis, inventariar linhas legadas e assegurar backup/restauração testados. Definir responsável pelo rollout e janela/forma de manutenção.
3. Validar em staging com versões reais do Prisma/adapter/PostgreSQL/pooler. Provar isolamento A/B sem filtro, contextos simultâneos, reset do contexto e falha de trilha antes de responder. Medir tamanho/latência/conexões/crescimento e timeout com volume real.
4. Revisar e aplicar migrations como owner separado, antes de iniciar esta versão da API. Esta mudança de papéis precisa de corte coordenado; não manter instâncias antigas com credenciais privilegiadas servindo tráfego clínico.
5. Provisionar LOGINs/segredos por mecanismo operacional aprovado e associar cada um a seu único grupo. Conferir grants reais e defaults do owner efetivo, inclusive negação de PUBLIC/anon/authenticated/service_role quando existirem.
6. Configurar as variáveis servidor-side e os cookies Secure/HTTPS, origens e proxy já documentados em SECURITY.md. Inicializar somente depois da aprovação de papéis.
7. Ativar enforcement com fluxo real de leitura/cadastro/dieta/agenda e falha induzida de auditoria em staging. Verificar no-store, imutabilidade, SYSTEM e ausência de dados clínicos nos erros/logs.
8. Operar a entrega independente, monitorar a fila e provar restauração antes de declarar a proteção ativa em produção.

Recuperação: interromper o tráfego clínico e preservar trilha/outbox/backup se houver falha. Não solucionar indisponibilidade desabilitando RLS, removendo guards, usando owner no runtime ou liberando resposta sem trilha. A migration não contém um downgrade destrutivo. Definir a recuperação operacional com o mantenedor; voltar ao binário antigo não prova compatibilidade com os novos papéis.

## Decisões para produção

| Decisão | Estado desta entrega |
|---|---|
| D1 retenção e expurgo | Prazo/processo não escolhidos; sem rotina de DELETE da trilha |
| D2 base legal e direitos sobre a trilha | Exige mantenedor/jurídico; sem conclusão legal nesta entrega |
| D3 cópia independente | Contrato/worker/outbox testados; destino, adaptador e execução operacional pendentes |
| D4 FKs/arquivamento | Contrato local implementado: Restrict; sessão sem FK |
| D5 falha/transição | Enforcement implementado; sem modo sombra/fallback. Homologação operacional pendente |
| D6 IP/user-agent | Fora da trilha; correlação por requestId precisa da observabilidade de acesso operacional |
| D7 investigação entre profissionais | Não concedida. Consulta própria implementada; papel investigador/encarregado pendente |
| D8 cron/SYSTEM | Implementado com conexão restrita, tarefa e execução identificadas |
| D9 transferência/cuidado compartilhado | Fora do escopo local; policies assumem dono único, sem transferência |
| D10 FORCE RLS | Prova local: owner separado e sem FORCE. Escolha operacional precisa de aprovação |

## Cópia e monitoramento

AuditDeliveryWorker é uma classe com contrato putIfAbsent(event), idempotente por eventId. Não está registrada como endpoint nem ativada automaticamente: não existe destino real configurado. O claim usa SKIP LOCKED e token UUID; sua transação termina antes da chamada externa. O ACK aceita apenas o token ainda vigente, sem atualizar a trilha. Tentativas falhas/claims vencidos permitem reenvio.

O adaptador real deve confirmar persistência durável antes de retornar e manter idempotência por eventId, com credenciais/controle de acesso independentes. Testes locais com destino sintético não comprovam armazenamento independente. Integrar e provar D3 antes da implantação.

pendingStats fornece quantidade pendente, evento mais antigo e máximo de tentativas. Definir alertas para crescimento/idade da fila, falhas de entrega, erros de auditoria, timeout/409 e saturação de conexões, com limites baseados em staging. Logs devem conter contagens/IDs técnicos necessários, sem payloads clínicos ou credenciais. Análise automática de incidentes não foi implementada por apenas criar a trilha.

## Reprodução local

Usar apenas PostgreSQL sintético em localhost:5434 (16) ou localhost:5435 (17), banco ecossistema_resiliencia_test. LOCAL_TEST_PG_PORT aceita somente essas portas; fixtures aleatórias usam prefixo safemove_security_ e são descartadas apenas depois de fechar conexões. O runner cria LOGINs locais NOBYPASSRLS; owner é usado somente para preparar/inspecionar fixtures.

Na pasta api, com DATABASE_URL e DIRECT_URL explicitamente apontando para esse banco sintético:

~~~powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run test:e2e
npx.cmd eslint '{src,apps,libs,test}/**/*.ts'
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd test -- --runInBand
~~~

Na pasta web:

~~~powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd cypress run --browser electron --spec cypress/e2e/read-audit-real.cy.ts
~~~

O build web exige destino interno de API explicitamente local para a validação. Cypress exige API real com as três conexões restritas e web standalone; cria duas contas sintéticas, usa login/logout visível, verifica trilha própria, filtro estrangeiro vazio, troca de conta, ausência de sessionId na tela/armazenamento e largura móvel via DOM. Captura/gravação permanece desabilitada. Antes de iniciar node .next/standalone/server.js, copiar public para .next/standalone/public e .next/static para .next/standalone/.next/static, como exige a montagem standalone. Iniciar depois da cópia para o servidor descobrir os assets.

A comparação Prisma banco→schema deve distinguir regras SQL deliberadas de nomes. As relações novas de auditoria estão alinhadas; permanece o rename de recipes_currentVersionId_fkey para recipes_id_currentVersionId_fkey, já presente no schema/migration anteriores ao HEAD base. Nenhuma migration histórica foi reescrita e esse rename não foi aplicado.

## Limites da prova

Os testes locais não atestam produção, pooler gerenciado, latência/capacidade real, retenção legal, cópia independente, pgaudit/logs de DBA, backups/restauração ou deployment. O GUC é uma defesa para filtros esquecidos em consultas com contexto confiável; quem consegue executar SQL arbitrário com a credencial pode alterá-lo. Comprometimento do servidor, capturas/copias/prints no navegador e acesso privilegiado direto ao banco não são cobertos pela trilha HTTP.

Referências: [locks de linha PostgreSQL 16](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS), [policies PostgreSQL 17](https://www.postgresql.org/docs/17/sql-createpolicy.html), [transações Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions).

## Verificação registrada em 2026-10-07

| Gate | Resultado |
|---|---|
| API unitários | 47 suítes, 475 testes, exit 0 |
| API E2E PostgreSQL 16.15 | 29 suítes, 187 testes, exit 0 |
| API E2E PostgreSQL 17.11 | 29 suítes, 187 testes, exit 0 |
| Web unitários | 59 arquivos, 391 testes, exit 0 |
| Cypress real de auditoria | 1 jornada, exit 0; screenshots 0, vídeo desabilitado |
| API/Web typecheck e lint | Exit 0, sem nova supressão |
| API build | Exit 0 |
| Web build + postbuild | Exit 0; CSP/direção nas 29 páginas e standalone sem dev packages/arquivos de ambiente |
| Prisma validate/generate | Exit 0 |
| Migrations em bancos vazios PG16/17 | 17 migrations aplicadas; 42/42 tabelas de aplicação com RLS |
| Diff Prisma | Exit 2 apenas pelo nome preexistente da FK de recipes; novas relações audit/outbox sem diferença |
| Revisão fresca da branch | Um reviewer independente; problemas confirmados corrigidos com regressões RED→GREEN, sem segunda revisão |

A jornada Cypress usa o build real, o proxy Next.js, cookies e os LOGINs clínico/auth/jobs restritos. A troca A→B não retorna eventos de A; filtro estrangeiro e ID inexistente não revelam existência. O botão Atualizar refaz o GET; voltar ao filtro já consultado pode usar o cache em memória da própria identidade.

Prova de lote interna à fronteira transacional: 500 Clients por operação, 8 operações (4 sequenciais e 4 concorrentes), 4000 eventos/outbox completos. No último PG16 sintético: mediana 1527 ms, máximo 1772 ms; execução local paralela com outras verificações. Não é benchmark HTTP nem capacidade de produção. Teto 1001 e rollback por timeout passaram; consulta/plano local não substituem medição no pooler e carga real.

Regressões da revisão: histórico Client autorizado com userId legado, nova dieta Client ligada a Patient, Food UPDATE concorrente com a FK do INSERT de receita e domínio OVERVIEW foram demonstrados falhando antes da correção e passaram no foco 24/24. SET ROLE iniciado por owner falhou antes da checagem de session_user e passou no foco 3/3. Cadastro das três profissões sob auth restrito retornava 500; o INSERT mínimo de authVersion fez o foco 3/3 passar. As suítes completas posteriores passaram nas duas versões do PostgreSQL.

O bootstrap verifica flags, memberships de owners/papéis com essas flags e separação dos grupos SafeMove; não calcula uma equivalência completa de todos os grants, funções ou papéis predefinidos. Esse inventário continua parte da Fase 0.

## Registro de implementação

Commit técnico: db034ed0ecfd2bba32e7be01ba79965d3194acc7. Evidência persistente: C:\Users\MICRO\.codex\state\plugins\codex-security\scans\security-followup\artifacts-d24209c2e31a8c4d3117accee187585a6b91c1cb986256d555d4f2914bd67406\artifacts\2026-10-07-read-audit-tenant-rls-verification.md.

~~~text
# SDD ledger — plan: docs/superpowers/plans/2026-10-06-read-audit-tenant-rls.md
Pre-flight: Task 1 -> 2 principal e TransactionClient; Task 2 -> 3 enum/evento e grants; Task 3 -> 4 deduplicacao e outbox; interfaces coerentes.
Ruling: scripts extensionless sao Bash, nao Python; usar Git Bash ou ledger equivalente PowerShell — compatibilidade Windows — custo: metadados de automacao feitos manualmente.
Task 1: started, BASE 934e183. RED sessao deve preservar jti validado sem expor em login/me.

Task 1: GREEN 19 regressões focais; fronteira fora de contexto e sessão validada. Typecheck inicial exit 0.
Task 2: GREEN RLS básico 2/2, migration nova aplicada somente no PG16 sintético.
Task 3: GREEN HTTP real 6/6: lista/eventos/outbox, rollback, contexto, catálogo global, revogação e descoberta.
Task 4: GREEN job restrito 1/1; trilha SYSTEM sem ator/sessão fictícios.
Ruling: transação HTTP externa Serializable para conservar o contrato da agenda; sem retry automático — custo: contenção/409 pode aumentar; medir em staging.
Ruling: catálogo usa bool global em função de definer limitado; removidos providers Prisma duplicados de Foods/Assessments — indispensável para todos os domínios partilharem ALS.
Ruling: fixture negativa de bootstrap por último; Passport registra estratégias no processo e uma app de teste fechada não pode substituir a autenticação dos HTTP seguintes. Conexões encerradas, sem forceExit ou DROP FORCE.


Task 2: GREEN PG16/PG17 23/23; matriz direta com filhos/modelos, SQL sem filtro, GUC vazio, ADMIN, RETURNING/upsert, CHECK SYSTEM, trail imutavel e privilegios minimos.
Task 4: GREEN 16/16 ampliados: corrida real FOR SHARE x UPDATE entre tenants e claim vencido confirmado somente pelo seu token.
Task 3: GREEN consulta propria HTTP paginada; UI RED 3/3 -> GREEN na suite web completa 391/391.
Ruling: substitui a isolacao global Serializable por ReadCommitted; handlers de agenda continuam Serializable — preserva arquivamento idempotente e isolacao exigida pelas transacoes existentes — custo: demais leituras usam snapshots por comando, com ownership revalidado antes do evento.
Ruling: teste historico da Data API usa banco aleatorio anterior a esta migration — reexecutar SQL antigo no banco compartilhado contaminava runtime — custo: este teste isolado nao atesta policies novas, cobertas pela matriz tenant.
Ruling: enforcement e o unico modo implementado; sombra e opcional de validacao e nao e fallback — nenhum dado clinico retorna se a trilha falhar — custo: indisponibilidade quando a auditoria falha, a ser homologada em D5.
Ruling: SAFE_MOVE_TEMPLATE continua permitido no INSERT SQL do papel clinico para templates internos ja existentes, enquanto DTO publico aceita apenas MANUAL — preservar fluxo aprovado — custo: papel tem esta autoridade adicional, sem acesso de importacao oficial TACO/TBCA.
Ruling: teto de resposta 1000, eventos em lotes 100, timeout HTTP configuravel — nao truncar trilha e conservar contratos atuais de listagem — custo: consultas legadas ainda materializam resultados antes de rejeitar amplitude, medir/paginar em staging.
Task 5: em andamento; PG16 lote 500 Clients por request, 8 requests/concurrency4: mediana2828ms max2950ms, 4000 eventos/outbox; teto1001 e rollback timeout aprovados. Medicao sintetica local, sem capacidade de producao.

Final review: fresh reviewer gpt-6-astra, candidate hash0E0CB8C...; resumed same reviewer after usage-limit error, no second review.
Final: regrade overview metadata Minor -> Important: auditoria apresenta visao completa como acesso basico; corrigir a classificacao e seu contrato de consulta.
Final: RED quatro falhas reais em 24 casos: historico migrado oculto, dieta Client ligada a Patient retorna500, UPDATE Food nao esperaFK, overview sem dominioOVERVIEW.
Ruling: historico vinculado a Client com creator/dono comprovados pode conservar userId; clientless legado continua negado e novas dietas gravam null — preserva upgrade sem alias inseguro — custo: metadado legado continua armazenado nos registros historicos.
Ruling: gatilhos de catalogo tambem usam FOR UPDATE antes da consulta global — conflito com KEY SHARE da FK protege SQL direto — custo: maior contencao, erros concorrentes devem permanecer genericos.

Ruling: bootstrap confere current_user e session_user, MEMBER e USAGE — owner disfarçado por SET ROLE deve continuar rejeitado — custo: conexoes NOINHERIT/privilegiadas nao podem iniciar runtime, requer provisionamento separado.
Ruling: schema novo declara UPDATE NoAction como SQL e preserva rename FK de recipes anterior ao trabalho — evita drift novo sem reescrever migration historica — custo: diff Prisma conserva um rename preexistente que deve ser reconhecido no gate.
Ruling: INSERT authVersion para papel auth — Prisma materializa default no cadastro e o papel ja pode atualizar a coluna para revogacao — custo: o papel de auth pode definir esse valor inicial; nao aumenta autoridade do papel clinico.
Final: RED cadastro HTTP restrito falha nas tres profissoes; GREEN 3/3 apos grant minimo.
Final: fixed historico migrado/dieta vinculada — 4 regressões RED→GREEN, foco 24/24.
Final: fixed Food UPDATE x INSERT com FK — writer sem lock explicito RED→GREEN, foco 24/24.
Final: fixed overview classificado — dominioOVERVIEW RED→GREEN, foco 24/24.
Final: fixed role owner SET ROLE — sessão privilegiada RED→GREEN, foco 3/3.
Final: Ruling: papéis/grants/pooler publicados nao atestados — pertencem Fase 0 e staging; prova local prossegue autorizada — custo: nenhuma garantia da implantacao real.
Final: Ruling: retenção/base legal/investigação transversal — D1/D2/D7 exigem mantenedor e jurídico, sem expurgo ou bypass de ADMIN local — custo: operação de produção incompleta até decisão.
Final: Ruling: cópia independente — D3 sem destino/adaptador real; contrato testado sem ativação automática — custo: outbox local sozinho nao resiste a comprometimento do banco.
Ruling: entrega em um commit de implementação e um commit de handoff, em vez de cinco commits parciais — fachada/auth/RLS/trilha exigem corte coordenado — custo: revisao e eventual reversao do patch tecnico sao maiores.

Task 5: GREEN API475/475, PG16/17 E2E187/187 por versao, web391/391, Cypress1/1, tipos/lint/builds/Prisma aprovados; diff somente nome FK preexistente.

Task 1-4: complete, commit db034ed; gates finais verdes; Task5 docs/evidencia persistente preparada.

~~~

## Preparação da publicação em 2026-10-07

O comando padrão npm run test:e2e foi reproduzido falhando em 11/11 casos de auth-session por ausência de CLINICAL_DATABASE_URL. O script agora chama test/run-tenant-tests.ts, que valida o banco sintético, provisiona LOGINs de teste restritos e passa as conexões ao Jest. O arquivo de workflow permanece com o mesmo comando npm run test:e2e.

Verificação desse comando padrão em PostgreSQL 16.15 vazio: 29 suítes, 187 testes, exit 0 (51,605 s). Nenhuma mudança de comportamento clínico ou de credenciais de produção. O README atualizado em origin/main é a única alteração posterior ao fork; merge-tree confirmou ausência de conflitos, sem integrar main nesta branch.
