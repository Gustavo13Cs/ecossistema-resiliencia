# Recuperação da migration de papéis no Render

Incidente de 2026-10-07: o build de eebfab1 passou, mas a publicação da API falhou em 20261006120000_read_audit_tenant_roles. Este documento prepara a operação para aprovação; nenhuma alteração em produção foi executada nesta investigação.

## Causa e estado observado

O log do PostgreSQL às 16:43:53 UTC registra `must be able to SET ROLE "safemove_catalog_lookup"`. A mensagem seguinte, apresentada pelo Prisma/Render, é `current transaction is aborted`. O postgres gerenciado do Supabase é NOSUPERUSER, CREATEROLE e BYPASSRLS; CREATE ROLE não lhe concedeu automaticamente SET/INHERIT para transferir e ajustar as permissões da função. A migration original foi verificada anteriormente com owner superusuário local, que contornava essa restrição.

A consulta somente de metadados encontrou a migration com finished_at e rolled_back_at nulos e applied_steps_count=0. Os seis grupos SafeMove, os dois objetos de auditoria e safemove_private estavam ausentes. As 40 tabelas anteriores continuavam com RLS; a tabela adicional era _prisma_migrations. O bloco BEGIN/COMMIT não deixou o novo schema instalado. O Render registrou P3009 nas tentativas seguintes, inclusive na instância da versão anterior que possui 16 migrations. Repetir o deploy não corrige esse registro.

Na rechecagem final, rolled_back_at já estava preenchido (2026-10-07T17:29:41 UTC), por uma ação externa a esta investigação. Os grupos, enums, schema, trilha e outbox continuavam ausentes. Portanto, não repetir migrate resolve para esse registro nem afirmar que P3009 permanece ativo; a falta de SET/INHERIT continua impedindo uma nova aplicação não preparada.

O último deploy marcado live no Render permanece em 934e183; eebfab1 está update_failed. A página nova /auditoria exige o endpoint da API nova. A captura de erro é compatível com essa diferença de versões; não foi inspecionada a requisição autenticada do navegador. GET anônimo /health retornou 404, portanto não foi tratado como um teste de health ou do fluxo autenticado.

Fontes: [transferência de owner no PostgreSQL 17](https://www.postgresql.org/docs/17/sql-alterfunction.html) e [recuperação de migration no Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing).

## Escopo da preparação

A migration e seu checksum são preservados. Os arquivos api/scripts/tenant-migration-prepare.sql e tenant-migration-cleanup.sql não são executados automaticamente pela aplicação.

Prepare cria somente safemove_catalog_lookup se necessário, verifica o owner e as restrições do grupo e lhe concede temporariamente SET e INHERIT. SET permite ALTER FUNCTION OWNER; INHERIT permite ajustar os grants da função depois da transferência. O grupo continua NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB e NOREPLICATION.

Cleanup, depois do commit, remove SET/INHERIT e CREATE no schema. A função permanece propriedade do grupo mínimo, sem ownership de tabela. O ADMIN da criação do grupo é preservado para o owner de migration; essa conta já possui autoridade administrativa e jamais deve ser usada pelo HTTP, auth ou cron. O teste comprova que o owner não consegue executar a função após cleanup.

## Operação a aprovar

Antes de executar, confirmar owner/session_user reais, backup e janela de manutenção. Executar comandos na pasta api de um checkout contendo a migration original de eebfab1, com DIRECT_URL do owner fornecida por mecanismo secreto. Não imprimir DSNs ou conteúdo clínico. Pausar tentativas concorrentes de migration/deploy.

1. Reconsultar _prisma_migrations e a ausência dos objetos/grupos novos. Se houver estado diferente da observação, interromper a recuperação e revisar o inventário. Não marcar como aplicada uma migration ausente nem excluir seu registro.
2. Resolver exclusivamente a falha confirmada **somente se finished_at e rolled_back_at continuarem nulos**. Na rechecagem final deste incidente rolled_back_at já está preenchido; pular este comando:

~~~sh
npx prisma migrate resolve --rolled-back 20261006120000_read_audit_tenant_roles
~~~

Esse comando atualiza o histórico; não executa rollback SQL. Aqui o rollback do BEGIN/COMMIT já foi observado. Se o objetivo imediato for restabelecer somente a API anterior, encerrar nesta etapa e validar/reiniciar a versão 934e183, que tem 16 migrations. Isso não disponibiliza o novo histórico de acessos. Não disparar o novo deploy sem a preparação seguinte.

3. Para implantar a API nova, executar tenant-migration-prepare.sql como o owner aprovado, no mesmo banco. Revisar antes os LOGINs e o corte do runtime descritos abaixo.
4. Aplicar a migration original:

~~~sh
npx prisma migrate deploy
~~~

5. Confirmar finished_at preenchido e ausência de falhas não resolvidas. Executar tenant-migration-cleanup.sql pelo mesmo owner. Verificar SET=false, USAGE=false, CREATE=false e food_in_use pertencente a safemove_catalog_lookup. Não executar cleanup por superusuário: esse papel sempre pode assumir outros papéis e o verificador rejeita o resultado.
6. Somente depois da configuração do runtime e aprovação do corte, publicar/reiniciar a nova API e verificar o fluxo autenticado de auditoria com a própria conta.

Se a nova tentativa falhar, parar o rollout, preservar os logs de erro sem dados clínicos e confirmar novamente o rollback. Enquanto o grupo de catálogo existir, retirar as permissões temporárias do owner real; neste incidente ele é postgres:

~~~sql
GRANT safemove_catalog_lookup TO postgres WITH INHERIT FALSE, SET FALSE;
~~~

Isso não substitui a inspeção do histórico e dos objetos. O script de cleanup normal exige a função instalada e não é um caminho para abortar uma migration sem commit.

## Configuração obrigatória do runtime

Os grupos NOLOGIN não provisionam senhas ou LOGINs de produção. Na inspeção os grupos ainda não existiam; não há prova de memberships/credenciais de runtime prontas. O conector do Render não forneceu uma operação de leitura dos nomes das variáveis; seus valores não foram coletados.

A nova API exige três conexões independentes:

| Variável | Grupo exclusivo do LOGIN |
|---|---|
| CLINICAL_DATABASE_URL | safemove_clinical |
| AUTH_DATABASE_URL | safemove_auth |
| JOBS_DATABASE_URL | safemove_jobs |

Cada LOGIN deve herdar seu grupo, sem superuser/BYPASSRLS/CREATEROLE/CREATEDB/REPLICATION, ownership ou memberships administrativas. Verificar current_user e session_user no processo real, incluindo o pooler. DATABASE_URL não fornece fallback e copiar a conexão postgres/owner para essas variáveis faz o bootstrap recusar o runtime.

A operação de migration deve permanecer separada do processo HTTP. O start command atual do Render roda migrate deploy e node juntos; coordenar o comando e o fornecimento de DIRECT_URL para que a conexão administrativa não permaneça disponível ao processo HTTP. O build pode usar um DSN fictício somente no processo de build, pois generate não conecta ao banco. Configuração proposta, a aplicar junto ao corte aprovado:

~~~sh
# Build command do Render (Linux)
DIRECT_URL='postgresql://build:build@127.0.0.1:5432/build' sh -c 'npm install --include=dev && npx prisma generate && npm run build'
# Start command, depois de aplicar a migration separadamente
node dist/src/main.js
~~~

Retirar DIRECT_URL e qualquer DATABASE_URL administrativa das variáveis do runtime; o build recebe apenas o valor fictício acima. Configurar as três URLs restritas por mecanismo secreto, sem registrar seus valores. Não alterar credenciais ou configuração automaticamente como consequência de executar estes scripts.

AUDIT_DELIVERY_DATABASE_URL/destino/adaptador independente e as demais decisões operacionais continuam descritos em read-audit-tenant-rls.md. Corrigir o deploy não encerra esses requisitos nem comprova a segurança inteira do ambiente.

## Verificação local desta recuperação

- Regressão real em PostgreSQL 17.11, owner LOGIN NOSUPERUSER/NOBYPASSRLS/CREATEROLE: RED com a falta de SET ROLE; GREEN com prepare/migration/cleanup, 42 tabelas com RLS, função restrita e nenhuma autoridade efetiva de catálogo herdada pelo owner.
- Fluxo do Prisma 7.10.0 em banco sintético: as 16 migrations históricas foram aplicadas por postgres local; o owner da fixture foi transferido para um LOGIN sem superuser, evitando a dependência histórica de ALTER DEFAULT PRIVILEGES FOR ROLE postgres. migrate deploy reproduziu a falha, a nova tentativa reproduziu P3009, migrate resolve --rolled-back e prepare permitiram aplicar a mesma migration. Resultado: 17 migrations concluídas, SET=false e INHERIT=false após cleanup.
- API: 47 suítes/475 unitários e 30 suítes/188 E2E completos em PostgreSQL 17.11; lint focal e typecheck aprovados. Prisma generate e build da API aprovados com DIRECT_URL ficticia, sem conexao ao banco.
- Nenhuma mudança em schema.prisma, migrations históricas, guards, RLS, CI, compose ou segredos. O teste prepara e descarta somente databases e LOGINs aleatórios de fixtures locais; o container deste trabalho é isolado em 127.0.0.1:5435 e usa tmpfs.
- Ainda não valida o pooler ou o processo de produção. Não houve merge, deploy, resolução remota ou provisionamento de LOGINs nesta investigação.
