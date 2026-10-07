# Recuperação da migration de papéis no Render

Incidente de 2026-10-07: o build de eebfab1 passou, mas a publicação da API falhou em `20261006120000_read_audit_tenant_roles`. O mantenedor autorizou a recuperação no Supabase e o ajuste das conexões/deploy no Render. A operação preserva a migration original.

## Causa confirmada

O PostgreSQL registrou às 16:43:53 UTC `must be able to SET ROLE "safemove_catalog_lookup"`. A mensagem posterior `current transaction is aborted` ocultou esse erro. O postgres do Supabase é NOSUPERUSER, CREATEROLE e BYPASSRLS; precisa de SET para transferir a função e INHERIT para ajustar sua ACL depois da transferência. A prova anterior com owner superusuário local não detectava essa restrição.

O BEGIN/COMMIT falhou sem instalar os seis grupos, a trilha, a outbox ou o schema privado. O registro original foi marcado rolled-back por uma ação externa às 17:29:41 UTC. Esta recuperação não repetiu migrate resolve nem excluiu registros.

O Render mantinha a API 934e183 como live e eebfab1 como update_failed. A página /auditoria nova exige o endpoint da API nova. A captura é compatível com essa diferença de versões; a requisição autenticada do navegador não foi inspecionada. /health retornou 404 e não foi tratado como verificação de saúde.

Referências: [ALTER FUNCTION no PostgreSQL 17](https://www.postgresql.org/docs/17/sql-alterfunction.html) e [recuperação de migrations no Prisma](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing).

## Operação aplicada no Supabase

Projeto aprovado: `zmjcxysenzrqycktckip`. Banco postgres, PostgreSQL 17.6, pooler em modo session na porta 5432. As conexões e senhas não constam neste documento.

1. Backup do schema public via pg_dump 17, cifrado por streaming com AES-256-GCM. Chave protegida por Windows DPAPI CurrentUser; diretório temporário com ACL restrita. O backup não inclui auth/storage nem representa backup completo da plataforma.
2. Restauração do backup por streaming em database aleatório de container PostgreSQL 17.11, com dados em tmpfs: 41 tabelas restauradas. A primeira tentativa falhou porque a database vazia já continha public; a segunda removeu somente esse schema vazio da fixture e passou.
3. Preflight confirmou o owner direto postgres, ausência de grupos novos/falhas pendentes e nenhuma outra conexão de migration observada.
4. Execução de api/scripts/tenant-migration-prepare.sql: permissão temporária SET/INHERIT de safemove_catalog_lookup ao owner.
5. Prisma 7.10.0 migrate deploy aplicou a migration original; 17 migrations concluídas.
6. Execução de api/scripts/tenant-migration-cleanup.sql: owner com SET=false e USAGE=false para o grupo de catálogo; função food_in_use pertencente ao grupo mínimo. CREATE no schema privado retirado.

Checksum SHA256 preservado da migration: `66bbd17d21f8bddb4ad36df13e7e9fe2ac7cd64adb0ece2646cc659116adc407`.

Se uma tentativa futura falhar após prepare, interromper o rollout, inspecionar histórico/rollback e retirar somente a autoridade temporária do owner correto:

~~~sql
GRANT safemove_catalog_lookup TO postgres WITH INHERIT FALSE, SET FALSE;
~~~

Cleanup normal exige a função instalada e não substitui a inspeção de uma falha. Não executar esses scripts no bootstrap da aplicação.

## Conexões restritas no Render

Foram provisionados quatro LOGINs NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB/NOREPLICATION, sem ownership. Os três primeiros herdam somente o grupo indicado, com ADMIN=false e SET=false.

| Variável | LOGIN | Grupo |
|---|---|---|
| CLINICAL_DATABASE_URL | safemove_runtime_clinical | safemove_clinical |
| AUTH_DATABASE_URL | safemove_runtime_auth | safemove_auth |
| JOBS_DATABASE_URL | safemove_runtime_jobs | safemove_jobs |
| DIRECT_URL | safemove_migration_check | nenhum |

Os três LOGINs passaram no assertDatabaseRole real da aplicação, conectados pelo pooler. DATABASE_URL foi esvaziada e DIRECT_URL administrativa substituída. O update do Render mesclou apenas essas cinco chaves; demais configurações foram preservadas.

O conector disponível não altera build/start commands. Por isso, o start atual continua `npx prisma migrate deploy && node dist/src/main.js`, mas DIRECT_URL permite somente USAGE no schema public e SELECT em _prisma_migrations. O checker não pode criar tabelas, escrever no histórico ou ler clients. Prisma migrate deploy com esse LOGIN passou contra o banco atualizado: nenhuma migration pendente. Uma migration nova exige aplicação separada com o owner antes do próximo deploy; o checker não tem autoridade para aplicá-la.

A separação definitiva recomendada continua sendo executar migrations fora do serviço HTTP e usar somente `node dist/src/main.js` no start. Enquanto os comandos atuais existirem, não recolocar uma credencial administrativa em DIRECT_URL para destravar um deploy.

## Certificado e TLS

O certificado público Supabase Root 2021 CA foi adicionado a api/certs, incluindo a imagem Docker de produção. Não contém chave privada. Procedência, validade e fingerprint estão em api/certs/README.md.

Runtime pg usa `sslmode=verify-full&sslrootcert=./certs/supabase-prod-ca-2021.crt`. O CLI Prisma usa `sslmode=require&sslaccept=strict&sslcert=./certs/supabase-prod-ca-2021.crt`. Os caminhos relativos foram testados a partir da pasta api; ../certs falhou nesta configuração. Verificação por Node: conexão TLS 1.3, encrypted=true e authorized=true.

A consulta pg_stat_ssl pelo pooler retornou ssl=false para o backend PostgreSQL. Essa visão descreve a conexão interna pooler→Postgres, não o socket externo validado. Esta operação não comprova TLS nesse trecho interno; a configuração do provedor precisa de revisão própria. [Visão pg_stat_ssl](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW).

## Evidência e limites

- Backup cifrado e manifesto local: C:/Users/MICRO/AppData/Local/Temp/safemove-production-recovery-20261007. A chave depende do usuário Windows que a protegeu; conservar ambos os arquivos e definir custódia/backup independente.
- Security Advisor depois da DDL: nenhum lint.
- Regressão de owner gerenciado em PostgreSQL 17.11: RED por falta de SET ROLE, GREEN com prepare/migration/cleanup. 42 tabelas de aplicação com RLS; função restrita.
- Validação local anterior do mesmo código: API 47 suítes/475 unitários, 30 suítes/188 E2E PG17; tipos, lint, generate e build aprovados. Não repetir as suítes sem mudança que justifique.
- Deploy com certificado publicado concluído; verificação HTTP sem sessão exige autenticação. Evidência final abaixo.
- A sessão própria na página /auditoria ainda requer validação autenticada. Não foram consultados prontuários nem criados registros clínicos para testar em produção.
- Destino/adaptador/cópia independente de auditoria, retenção/base legal, indisponibilidade/carga e demais decisões continuam no runbook read-audit-tenant-rls.md. Recuperar o deploy não encerra a segurança operacional do projeto.

## Dependência corrigida durante a recuperação

O audit detectou proxy-addr 2.0.7 com [GHSA-jqcg-44mw-7w3h](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h). O lockfile foi atualizado exclusivamente para 2.0.8, sem alterar package.json. O caso de subnet IPv4-mapped incorreta aceitava um IPv4 externo antes; depois rejeita, preservando a subnet IPv4 correta. Não há configuração trust proxy dessa forma no bootstrap atual; a operação remove a dependência afetada, sem afirmar exploração no SafeMove.

Após a atualização: 47 suítes/475 unitários da API passaram; npm audit --omit=dev --omit=optional retornou zero vulnerabilidades. O conjunto completo ainda apresenta 34 alertas (5 moderados, 29 altos) e requer remediação própria. O build Docker foi repetido e aprovado para o lockfile atualizado.

## Conclusão do deploy

PR [#24](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/24) integrado após revisão independente sem achados e todos os checks: unitários, E2E, TypeScript, Cypress e Vercel. Commit publicado: `2e504765a115852674cf175d188d104902d22aad`.

Render: deploy `dep-db3aj9u0tbcc739bo7m0`, status **live**, concluído em 2026-10-07 20:23:00 UTC (17:23 em Brasília). O start registrou “No pending migrations to apply” e “Nest application successfully started”. O serviço iniciou com as conexões restritas e o certificado publicado.

A atualização de ambiente havia disparado automaticamente um deploy de eebfab1 em 20:06 UTC; ele falhou por P1011, certificado ainda ausente nesse commit. O deploy do novo commit contém o arquivo e encerrou essa falha. Nenhuma tentativa extra foi disparada após o merge; o Render publicou automaticamente.

Probes HTTPS sem sessão em /read-audit e /clients retornaram 401. Isso confirma a disponibilidade da rota e a exigência de autenticação; não valida a consulta na sessão própria do usuário. A confirmação da página foi solicitada ao mantenedor, sem acessar credenciais de conta ou conteúdos clínicos.

No pooler real, clínico/jobs sem contexto de tenant enxergaram zero clients; auth/checker receberam 42501 em SELECT clients LIMIT 0. Nenhum conteúdo de prontuário foi retornado nos probes.

Imagem Docker final: build aprovado; UID1000, CA presente, proxy-addr2.0.8, sem .env ou Prisma CLI. Container temporário de restauração/testes removido. Backup cifrado/manifesto/chave DPAPI preservados; a cópia temporária DPAPI das credenciais de runtime foi retirada após o serviço ficar live.

Esta conclusão cobre a recuperação do deploy. A verificação autenticada da interface, TLS interno do pooler, carga, destino independente da auditoria, retenção/custódia e 34 alertas do conjunto completo de dependências continuam delimitados acima.
