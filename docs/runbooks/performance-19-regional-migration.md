# Performance 19 — aproximação regional da API

## Resultado em 17/11/2026 (America/Fortaleza)

Tráfego de produção transferido da API Render Oregon para a API Render Virgínia. PostgreSQL permanece no Supabase São Paulo. A comparação nos próprios servidores mediu **177,81 → 116,13 ms por consulta constante aquecida (−34,69%)**. A Virgínia mantém um agendador ativo; o Oregon fica como reserva com zero. Nenhuma migration, alteração de RLS, grants ou autenticação foi executada em produção.

O bloqueio inicial da revisão automática foi resolvido pela autorização específica posterior do mantenedor para criar a API pública com conexões de produção e transferir o tráfego. O estado bloqueado em [regional-latency.json](evidence/performance-19/regional-latency.json) representa a primeira coleta, não o estado atual. Resultado final, amostras e identificadores: [migration-result.json](evidence/performance-19/migration-result.json).

## Topologia e publicação

| Camada | Recurso | Região / estado |
|---|---|---|
| Frontend e proxy `/api` | Vercel `prj_Q4HElpVnkrbUVlogPwTtUCjbosot`; domínio `ecossistema-resiliencia.vercel.app` | `iad1`, deployment `dpl_3XdVSb1ePTopfobrCPuwxxp74KyK`, READY |
| API ativa | Render `srv-dbueksec6qcc73dhgp50`; `https://safemove-api-virginia-6yha.onrender.com` | Virgínia, Free; deploy `dep-dbuf5fec6qcc73dj3l90`, commit `d92a628` |
| API reserva | Render `srv-d8fmspjbc2fs73brg8p0`; `https://ecossistema-resiliencia.onrender.com` | Oregon, Free; cron desativado; identificador final no JSON |
| PostgreSQL | Supabase `zmjcxysenzrqycktckip`, `ecossistema-resiliencia-db` | `sa-east-1`, São Paulo, Postgres `17.6.1.084`, sem mudança |

Antes: navegador → Vercel → API Oregon → PostgreSQL São Paulo. Depois: navegador → Vercel → API Virgínia → o mesmo PostgreSQL São Paulo. Render não oferece região brasileira; a API continua nos EUA.

O frontend foi reconstruído com o **mesmo commit de produção `69fd92145e47833f3aec83637c454c1660f9ea0b`**, mudando apenas o upstream. A API foi reconciliada com esse `main` no merge `47ded82`, preservando os módulos recentes e as correções N+1. Schema, migrations, auth, guards, segurança e estratégias têm delta vazio contra esse `main`. A migração P4 que aparece no merge já pertence a `main`; não foi criada nem executada por esta entrega.

As duas APIs usam `node dist/src/main.js`, sem `prisma migrate deploy`. Os Blueprints estão na branch `agent/codex/performance-diagnosis`, com **autoSync e auto-deploy desligados**. Futuras mudanças de backend precisam de deploy manual revisado; publicar novos commits nesta branch não atualiza automaticamente a produção. Nenhum merge para `main` foi realizado nesta publicação.

## Medição repetível e resultado

A mesma sonda abriu a conexão clínica restrita copiada por referência interna do Render, iniciou `BEGIN READ ONLY`, verificou papel sem superuser/BYPASSRLS, fez três aquecimentos e quinze `SELECT 1 AS region_probe`, executou `ROLLBACK` e fechou a conexão. Há timeouts de conexão/query de dez segundos e sanitização de erros. Não há leitura de prontuários ou gravação de dados.

| Métrica nos próprios servidores da API | Oregon → banco | Virgínia → banco | Diferença |
|---|---:|---:|---:|
| Mediana SQL aquecido, 15 amostras | 177,81 ms | 116,13 ms | −61,68 ms / **−34,69%** |
| p95 SQL | 178,64 ms | 116,68 ms | −61,96 ms / −34,68% |
| Abertura da conexão, uma amostra | 1.188,43 ms | 812,98 ms | −375,45 ms |
| Captura UTC, 18/11/2026 | 00:31:45 | 00:23:16 | Janela de aproximadamente nove minutos |
| Deploy medido | `dep-dbuf2tuc6qcc73diqnt0` | `dep-dbuevaoae00c73eba9l0` | Código da sonda idêntico |

A coleta inicial, com sondas Free separadas e janela de 30 segundos, encontrou **178,23 → 114,36 ms (−35,84%)**. Esse conjunto confirma a direção do resultado, mas não foi misturado ao conjunto dos servidores reais. Amostras iniciais: [regional-latency.json](evidence/performance-19/regional-latency.json); amostras finais: [migration-result.json](evidence/performance-19/migration-result.json).

O tempo SQL inclui rede, pooler, protocolo, driver e execução constante. Não é RTT ICMP nem tempo de uma consulta clínica. Com quinze amostras, o p95 equivale ao máximo observado; abertura de conexão tem apenas uma amostra por região. O deploy final remove a sonda do startup das duas APIs; ela não acrescenta viagens de banco a cada cold start.

Para repetir, usar o mesmo script compilado `dist/scripts/region-latency.js`, no servidor de cada região, com a conexão clínica existente fornecida internamente como `REGIONAL_DATABASE_URL` e `PROBE_REGION=oregon` ou `virginia`. Coletar uma execução por região, arquivar as quinze amostras e comparar medianas/p95. Não expor a URL de conexão, usar papel privilegiado ou substituir a medida por uma execução no notebook. No plano Free, sem SSH/one-off jobs, repetir por deploy controlado de sonda, mantendo o modo READ ONLY; depois retirar novamente a referência de conexão.

**Não medidos:** tempos de telas autenticadas, salvamento clínico, Lighthouse/LCP, cold start e p95 HTTP em produção. O Render retornou série vazia para p95 HTTP; o conector HTTP não fornece duração comparável. A redução acima se refere ao caminho API–banco, sem promessa numérica de melhoria de tela.

## Validação do tráfego e dos agendadores

Verificações somente de leitura no domínio principal, após a troca:

| Requisição | Resultado observado |
|---|---|
| `/` | HTTP 200 |
| `/api/auth/csrf` | HTTP 200, `X-API-Region: virginia`, `Cache-Control: no-store`, cookie Secure/HttpOnly |
| `/api/auth/me`, sem sessão | HTTP 401 |
| `/api/clients`, sem sessão | HTTP 401 |

O conector omite headers/corpo das respostas 401; apenas o status foi verificado nesses dois casos. Não foram arquivados tokens ou cookies. JWT, papéis de banco, CORS e opções de cookies foram reaproveitados por referências internas, sem revelar ou trocar os segredos. As opções ausentes `AUTH_COOKIE_DOMAIN` e `AUTH_REFRESH_COOKIE_PATH` foram omitidas para conservar os defaults.

O Oregon registrou `regional_api_ready` com `activeScheduledJobs: 0` às **00:31:57 UTC**. Só depois foi aplicada a ativação na Virgínia, que registrou **1** às **00:36:42 UTC**. O logger consulta o `SchedulerRegistry`, contando jobs realmente ativos, sem executar alertas. Há um breve intervalo sem agendador na transferência; não houve sobreposição de jobs ativos. Não foi disparada manualmente a rotina de alertas em produção.

### Ocorrência durante a publicação e correção

A conferência de paridade revelou que a branch de performance estava baseada no P3 e não incluía os módulos recentes do backend. Essa conferência deveria ter ocorrido antes do primeiro deploy candidato. Um primeiro build de produção chegou a READY; o tráfego foi devolvido ao deployment Vercel original e a configuração original foi restaurada. O rollback confirmou HTTP 200 no CSRF do domínio principal.

A execução então incorporou `origin/main`/`69fd921` no merge `47ded82`, preservou os testes P4 e de batching, regenerou o Prisma Client a partir do schema local e repetiu os gates completos. A API corrigida chegou a live e confirmou as rotas de anamnese de treino antes da promoção final. O deployment de produção com o novo upstream foi validado e promovido novamente. Não há medição de sessões reais durante esse intervalo; não se afirma ausência de impacto a usuários que estivessem conectados.

## Arquivos da mudança regional

| Arquivo | Finalidade |
|---|---|
| `api/scripts/region-latency.ts` e `api/src/infra/database/region-latency.spec.ts` | Sonda READ ONLY, contagem, timeouts, restrição de papel, encerramento e erros sem segredos; modo desativado não conecta ao banco. |
| `api/src/modules/alerts/alerts-cron-config.ts` e `.spec.ts` | Flag tipada/validada de reserva; ausente ou false conserva o agendamento. |
| `api/src/modules/alerts/alerts.cron.service.ts` | Aplica a flag ao decorator Cron; lógica de alertas preservada. |
| `api/src/main.ts` | Header regional e contagem dos jobs ativos, sem modificar guards, CORS ou autenticação. |
| `ops/render/api-virginia.yaml` | API ativa Free; papéis/JWT/CORS/cookies por referência interna; cron ligado; startup sem migrations/sonda. |
| `ops/render/oregon-standby.yaml` | Adota a API original como reserva; cron desligado; startup sem migrations/sonda. |
| `ops/render/region-probes.yaml` | Sondas aposentadas, credencial substituída por valor inerte, sem novas conexões e auto-deploy desligado. |
| `api/src/modules/workouts/workout-templates.service.spec.ts` | Concilia fixtures P4 e testes de batching no merge de paridade. |
| Este runbook, evidências, `docs/TASKS.md` e `docs/agents/CODEX_STATUS.md` | Estado, métricas, limites, publicação e rollback. |

Nenhuma dependência nova. Nenhum SQL de migration/rollback criado para esta mudança regional. Os arquivos de schema/migrations incorporados de `main` não constituem uma alteração de banco desta entrega.

## Custos e limites

- API ativa e reserva mantêm o plano Free: **US$ 0/mês de compute contratado**; nenhuma instância paga foi criada. Builds e egress consomem cotas, cujo saldo/excedente não foi acessível pelo conector.
- **750 horas Free por workspace/mês são compartilhadas.** Duas APIs sempre acordadas excederiam a cota. A reserva fica sem tráfego e entra em repouso por inatividade; não criar monitor/keep-alive para ela. Após a janela de rollback, remover ou suspender no painel para liberar a cota. O conector não oferece remoção/suspensão.
- As sondas foram desativadas e tiveram a credencial neutralizada; os deploys `dep-dbudul7f3r2c73apm9og` e `dep-dbudumom7kps73c4d6g0` chegaram a live e registraram `postgres-region-probe-disabled`. Evidência: [probe-retirement.json](evidence/performance-19/probe-retirement.json). Permanecem cadastradas, sem tráfego/queries; podem ser removidas no painel.
- Free repousa após quinze minutos sem tráfego. Cold starts permanecem. O rollback para uma reserva adormecida exige esperar seu despertar e confirmar saúde antes de transferir tráfego.
- A região de um serviço Render é imutável, e Render/Supabase não compartilham rede privada. A melhoria regional não elimina toda a latência internacional.

Referências consultadas: [regiões Render](https://render.com/docs/regions), [Free](https://render.com/docs/free), [compute](https://render.com/docs/compute-plans), [preços](https://render.com/pricing), [Blueprint/fromService](https://render.com/docs/blueprint-spec#referencing-service-properties), [regiões Supabase](https://supabase.com/docs/guides/platform/regions).

## Rollback concreto

1. Despertar/confirmar saúde da reserva Oregon e sua paridade de código antes da transferência. Não reativar cron ainda. O hostname original continua disponível.
2. Devolver o tráfego Vercel ao deployment original **`dpl_H9dEYUdgaXcPPCvp2E8hNme7benf`**, que contém o upstream anterior. O rollback para esse deployment foi exercitado durante a correção de paridade. Confirmar `/api/auth/csrf` 200 com `X-API-Region: oregon`.
3. Restaurar também a configuração para futuros builds: a variável sensível original `NEXT_PUBLIC_API_URL`, ID **`R4dgDm6zH17Wk9aB`**, teve seu valor opaco preservado. Está em preview, específica da branch `agent/codex/performance-diagnosis`. A nova variável **`TLXzIEvfKTDrwkw6`** está em preview/production com URL Virgínia. Primeiro retirar production dos targets da nova variável; depois colocar a original em production, com `gitBranch: null`, **sem enviar o campo value**. Isso restaura o valor original sem decriptá-lo. Preservar Supabase e demais variáveis.
4. Desligar o agendamento na Virgínia (`DISABLE_SCHEDULED_ALERTS=true`), esperar live e confirmar zero jobs ativos. Só então reativar no Oregon (`false`), esperar live e confirmar um. Atualizar os YAMLs junto da configuração externa para evitar divergência em planos posteriores.
5. Banco continua o mesmo; não há SQL de rollback ou cópia de dados. Reverter commits sozinho não reverte infraestrutura, tráfego ou variáveis externas.

A exceção de preview da branch de performance aponta para o upstream original como cópia de rollback; o default global de preview e production aponta para Virgínia. Conferir essa exceção antes de usar previews dessa branch para homologar a API nova. Não sobrescrever a variável original enquanto a janela de rollback estiver aberta.

Referências: [Instant Rollback](https://vercel.com/docs/instant-rollback), [promoção](https://vercel.com/docs/deployments/promoting-a-deployment).

## Gates e conferência manual

Após conciliar com `main`: **819/819 unitários API (63 suítes), 256/256 PostgreSQL/HTTP/RLS (41 suítes) e 773/773 web (99 arquivos)**. NestJS/Next.js, TypeScript e lint padrão passaram; o script novo foi incluído no lint. Pós-build confirmou 32/32 páginas de produção local e standalone sem pacotes de desenvolvimento/arquivos de ambiente. Após o logger final, unitários API, build, tipos e lint foram repetidos com sucesso. Os testes PostgreSQL usam Docker sintético isolado; não produção. YAMLs e `git diff --check` conferidos no fechamento.

Não houve sessão de teste autenticada disponível para browser em produção. Para conferir manualmente no domínio principal:

1. Entrar com uma conta existente; abrir dashboard e lista de clientes. Em Network, confirmar que uma resposta da API traz `X-API-Region: virginia`.
2. Abrir um cliente autorizado, seu plano alimentar e treino; verificar anamnese, modelos e impressão existentes.
3. Em um prontuário de teste, salvar uma alteração reversível no plano/treino, recarregar e conferir persistência. Não usar dados clínicos reais como carga de benchmark.
4. Sair e entrar novamente; conferir sessão e acesso. Acessos sem sessão devem continuar negados. A rotina diária deve ocorrer apenas na Virgínia; conferir seus logs no próximo horário normal, sem disparar alertas manualmente.

Tempos reais de tela/salvamento e monitoramento prolongado de produção ficam como acompanhamento; não foram substituídos por números inferidos da sonda SQL.
