# Performance 19 — aproximação regional da API

## Situação da entrega

Regiões revalidadas, latência PostgreSQL medida em duas regiões reais, código e configurações preparados na branch `agent/codex/performance-diagnosis`. A migração da API e a troca de tráfego **não foram executadas**: a revisão automática rejeitou a aprovação do Blueprint da candidata pública, solicitando autorização específica para esse deploy conectado à produção.

O plano revisável é [API candidata na Virgínia](https://dashboard.render.com/blueprint/exs-dbudsmajnfac73cuol0g/sync/exe-dbudsmajnfac73cuolh0), commit `721016c`. O plano cria um serviço Free e não altera o serviço atual. Não há migration de banco ou mudança de RLS, permissões e autenticação.

## Topologia confirmada em 17/11/2026

| Camada | Recurso confirmado pelo conector | Região / versão | Estado |
|---|---|---|---|
| Frontend / proxy `/api` | Vercel `prj_Q4HElpVnkrbUVlogPwTtUCjbosot` | `iad1`, Virgínia | Produção `dpl_H9dEYUdgaXcPPCvp2E8hNme7benf`, commit `69fd921` |
| API atual | Render `srv-d8fmspjbc2fs73brg8p0`, `ecossistema-resiliencia` | Oregon, Free, uma instância | Live `dep-dbn2vvqfngtc73aui6g0`, commit `81a850f` |
| PostgreSQL | Supabase `zmjcxysenzrqycktckip`, `ecossistema-resiliencia-db` | `sa-east-1`, São Paulo, Postgres `17.6.1.084` | `ACTIVE_HEALTHY` |
| API candidata | Blueprint `exs-dbudsmajnfac73cuol0g` | Virgínia, Free | Planejado; deploy bloqueado antes da criação do serviço |

Fluxo atual: navegador → Vercel/proxy nos EUA → API Oregon → PostgreSQL São Paulo. Fluxo proposto: navegador → Vercel → API Virgínia → o mesmo PostgreSQL São Paulo. A migração proposta aproxima as camadas dentro das opções atuais do Render; não coloca a API no Brasil.

Fonte: `Render.get_service`, `list_deploys`, `Supabase.get_project`, `Vercel.get_project` e `get_deployment`. O `origin/main` atual contém `69fd921`; o delta de API entre `81a850f` e esse commit é vazio. A candidata usa a branch de performance, que acrescenta as correções do item 08 já testadas, a sonda e a configuração explícita do agendador.

## Medição real, antes de qualquer troca de tráfego

As duas sondas executaram o mesmo código (`308192c`), com a **mesma conexão clínica** copiada por referência dentro do Render, sem revelar valores. São duas instâncias Free nas respectivas regiões, e não uma execução dentro da instância de produção. Cada uma abriu uma conexão, iniciou `BEGIN READ ONLY`, verificou `transaction_read_only` e papel sem superuser/BYPASSRLS, fez três aquecimentos e quinze `SELECT 1 AS region_probe`, terminou com `ROLLBACK` e fechou a conexão.

| Métrica | Sonda Oregon → banco atual | Sonda Virgínia → banco atual | Diferença |
|---|---:|---:|---:|
| Mediana SQL, conexão aquecida | 178,23 ms | 114,36 ms | −63,87 ms / **−35,84%** |
| p95 SQL, 15 amostras | 178,63 ms | 114,82 ms | −63,81 ms |
| Abertura da conexão, uma amostra | 1.340,16 ms | 793,09 ms | −547,06 ms |
| Captura UTC | 23:02:57 | 23:03:25 | Mesmo dia e janela de aproximadamente 30 segundos |

Os valores integrais e todas as amostras estão em [regional-latency.json](evidence/performance-19/regional-latency.json). IDs das sondas/deploys constam nesse arquivo. O p95 de quinze amostras representa o máximo desse conjunto, não uma caracterização estatística de produção. A abertura tem apenas uma amostra por região.

O tempo de `SELECT 1` inclui rede, pooler, protocolo, driver e execução constante no banco. Não é ping ICMP nem benchmark de consulta clínica. A diferença medida sustenta a escolha da Virgínia; a melhoria de uma tela depende da quantidade de viagens, paralelismo e processamento. Por exemplo, dez viagens sequenciais poderiam economizar aproximadamente 639 ms de espera se a diferença permanecesse igual; isso é uma estimativa, **não tempo de tela medido**.

HTTP p95 do Render retornou série vazia no conector. LCP/Lighthouse, telas autenticadas, salvamento de dados reais e tempo HTTP depois da migração continuam **não medidos**. Uma chamada de leitura ao domínio atual da Vercel confirmou `/api/auth/csrf` com HTTP 200, `Cache-Control: no-store` e cookie HttpOnly/Secure. Tokens/cookies dessa verificação não foram arquivados.

## Restrições e custos verificados

- O Render atualmente oferece Oregon, Ohio, Virgínia, Frankfurt e Singapura. Não oferece região no Brasil. A região de um serviço existente é imutável: é preciso criar outro serviço e transferir a configuração/tráfego.
- O plano Free atual custa US$ 0/mês de compute, com 0,1 CPU e 512 MB. A candidata mantém esse plano; não foi contratado plano pago. O plano pago de 0,5 CPU/512 MB é listado a US$ 7/mês, mas não faz parte desta execução.
- A cota de **750 horas Free por workspace/mês é compartilhada**. Sondas, candidata e reserva consomem horas enquanto acordadas. Manter duas APIs sempre acordadas por um mês ultrapassaria essa cota; a reserva precisa ficar sem tráfego/ser suspensa ou removida após a janela de rollback.
- Builds e saída de dados consomem as cotas do workspace. Saldo e eventual excedente não foram acessíveis por este conector; a previsão de compute gratuito não é garantia de custo total zero.
- Free entra em repouso após quinze minutos sem tráfego e não permite SSH/one-off jobs. A mudança regional não elimina cold starts.
- Supabase e Render continuam se comunicando pela conexão externa existente. Não há rede privada compartilhada entre esses dois provedores.

Referências consultadas no dia: [regiões](https://render.com/docs/regions), [Free](https://render.com/docs/free), [compute](https://render.com/docs/compute-plans), [preços](https://render.com/pricing), [Blueprint/fromService](https://render.com/docs/blueprint-spec#referencing-service-properties), [regiões Supabase](https://supabase.com/docs/guides/platform/regions). A consulta direta por HTTP no shell foi negada pelo proxy; os documentos foram lidos pelo conector web. O changelog Supabase também foi conferido; não há uso de CLI Supabase ou alteração de banco nesta entrega.

## Implementação preparada

| Arquivo | Alteração |
|---|---|
| `api/scripts/region-latency.ts` | Sonda constante de leitura, timeouts, resumo, sanitização de erros, conexão fechada e HTTP sem disparar novas queries. Modo de desativação permite retirar credenciais após a coleta. |
| `api/src/infra/database/region-latency.spec.ts` | Aquecimento, contagem, READ ONLY, recusa de papel privilegiado, falha de conexão, estatísticas e ausência de segredos em erros. |
| `api/src/modules/alerts/alerts-cron-config.ts` e `.spec.ts` | `DISABLE_SCHEDULED_ALERTS=true` desliga o agendador na reserva; ausente/false conserva o comportamento atual. Valores ambíguos falham na inicialização. |
| `api/src/modules/alerts/alerts.cron.service.ts` | Aplica a opção `disabled` ao decorator Cron. A execução manual do método e a lógica dos alertas permanecem. |
| `ops/render/region-probes.yaml` | Declara sondas Free, auto-deploy desligado. A versão inicial referencia a conexão no Render; a versão final remove a referência e desativa a coleta. |
| `ops/render/api-virginia.yaml` | API candidata com cópia interna dos papéis restritos/JWT/CORS/cookies e agendador inicialmente desligado. Startup executa apenas Node, sem `prisma migrate deploy`. `DIRECT_URL` é um placeholder local usado apenas para geração do Prisma Client. |
| `ops/render/oregon-standby.yaml` | Configuração preparada, não aplicada, para adotar somente a API atual e mantê-la como reserva com cron desligado. Demais variáveis são preservadas pelo Blueprint. |

`AUTH_COOKIE_DOMAIN` e `AUTH_REFRESH_COOKIE_PATH` aparecem como referências ainda não resolvidas no plano da candidata, diferentemente das referências que já foram resolvidas e redigidas pelo Render. Antes de aplicar, confirmar se essas variáveis estão ausentes na origem e, nesse caso, omiti-las para conservar os defaults. Nunca inventar valores de segredos ou trocar o JWT.

## Sequência de migração e validação ainda pendente

1. Autorizar especificamente o deploy da API pública candidata com conexões de produção e a troca de tráfego. A autorização genérica desta rodada foi recusada pela revisão automática. Não houve tentativa de contornar a recusa.
2. Confirmar as duas configurações opcionais mencionadas acima. Revisar novamente o plano antes de aplicar. Criar apenas a candidata Free, mantendo o cron desligado e a API atual atendendo.
3. Acompanhar o deploy até `live`; confirmar build, inicialização dos três papéis restritos e ausência de erros. A aceitação do pedido de deploy não prova que a API ficou disponível.
4. Validar candidata por HTTP: CSRF, negação de endpoints sem sessão, CORS e sessão autorizada de teste. Conferir cookies, JWT compartilhado, ownership, leitura de ficha e salvamento de um registro sintético autorizado. Não criar/excluir conteúdo clínico real para medir.
5. Trocar o upstream do frontend na Vercel, preservando o código do frontend de produção (`69fd921`) e os demais ambientes/configurações. `NEXT_PUBLIC_API_URL` está cadastrado para preview/production; o conector omite seu valor mesmo ao pedir decriptação. O upstream público atual foi identificado pelo único serviço Render associado e pelo fluxo em produção. Antes de sobrescrever, confirmar o valor exato pelo painel ou configuração do deployment para preservar um rollback completo do ambiente.
6. Estagiar/testar um build de produção com o novo upstream e promover o build testado. A promoção de preview pode reconstruir com variáveis de produção; não tratar isso como a publicação do mesmo build. Não trocar o código do frontend pela versão antiga desta branch de performance.
7. Após tráfego validado, aplicar a reserva Oregon com `DISABLE_SCHEDULED_ALERTS=true`, verificar o deploy e ativar o agendador na Virgínia com `false`. Conferir que existe apenas um agendador ativo antes do horário diário. As duas regiões conectam ao mesmo banco; não existe replicação de escrita ou cópia de dados.
8. Repetir a medição SQL na nova região e comparar tempo HTTP de rotas equivalentes na mesma origem/rede de teste. Registrar erros, taxa de sucesso e duração. Encerrar/suspender a reserva após a janela combinada para não consumir a cota Free indefinidamente.

As etapas 2–8 estão preparadas para execução após resolver o bloqueio da etapa 1. O frontend e a API atual não foram reconfigurados nesta rodada.

## Rollback concreto

- Frontend: devolver o tráfego ao deployment Vercel `dpl_H9dEYUdgaXcPPCvp2E8hNme7benf`, cujo build contém o upstream anterior. Restaurar também a configuração de ambiente original antes de futuros builds. Referências: [Instant Rollback](https://vercel.com/docs/instant-rollback) e [promoção](https://vercel.com/docs/deployments/promoting-a-deployment).
- Agendadores: desligar na candidata e reativar na reserva (`DISABLE_SCHEDULED_ALERTS=false`), acompanhando cada deploy. O helper rejeita valores diferentes de `true`/`false`.
- API: manter o hostname Oregon `https://ecossistema-resiliencia.onrender.com`. O live original é `dep-dbn2vvqfngtc73aui6g0`/`81a850f`; verificar retenção do artefato antes de depender de rollback de build. A reversão regional principal é a troca de tráfego para a reserva, pois a região não é editável.
- Banco: nenhuma migration prevista/executada, nenhuma mudança de região/schema/RLS/ACL. Não há SQL de rollback. Os serviços compartilham o mesmo banco e o mesmo segredo JWT.
- Repositório: commits operacionais separados na mesma branch. Reverter código não muda a região ou desfaz configurações externas; usar os passos de tráfego/agendador acima.

## Verificações executadas

- Build NestJS e `tsc --noEmit --incremental false`: aprovados.
- Unitários API: **811/811, 62 suítes**. Após desativar a sonda, regressões focadas: **27/27, 3 suítes**.
- ESLint padrão completo da API mais o script novo: aprovado. Ao ampliar para todos os scripts antigos, foram encontrados dois erros de formatação já existentes em `verify-exercise-demonstrations.ts`, fora do comando padrão do projeto; esse arquivo foi preservado e a verificação padrão/focada passou.
- Compilação isolada da sonda, conexão real a PostgreSQL local com papel restrito e recusa de superusuário: aprovadas. Os números locais desse smoke não integram a tabela regional.
- Metadata do Cron no código compilado: `disabled=true` na reserva e `disabled=false` na principal, conferidos em processos separados.
- Validação de YAML local e planejamento no Render: aprovados para as sondas e candidata. Sondas chegaram a `live` e produziram os resultados acima. O deploy da candidata foi recusado pela revisão automática antes da criação.
- Frontend sem alterações de código. A verificação desta rodada no domínio atual confirmou CSRF HTTP 200. Os 751 testes web e 255 PostgreSQL da entrega anterior não são apresentados como novas execuções desta etapa.

## Encerramento das sondas

Após arquivar as amostras, `REGIONAL_DATABASE_URL` foi sobrescrito por um valor inerte, `PROBE_DISABLED=true` foi aplicado e os deploys de encerramento chegaram a **live**: `dep-dbudul7f3r2c73apm9og` Oregon às 23:13:25 UTC e `dep-dbudumom7kps73c4d6g0` Virgínia às 23:13:33 UTC. Ambos registraram `postgres-region-probe-disabled`, confirmado pelo conector de logs. A configuração versionada também foi neutralizada e auto-sync/auto-deploy permanecem desligados. O modo desativado serve somente uma resposta de saúde e não abre conexões de banco. Os serviços Free permanecem cadastrados no Render; o conector não oferece remoção/suspensão. Entram em repouso por inatividade; podem ser removidos no painel sem afetar a API.
