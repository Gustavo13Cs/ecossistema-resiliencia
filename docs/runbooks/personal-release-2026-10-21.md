# Publicação Personal — 21/10/2026

Publicação concluída: [PR #30](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/30) integrado na main em `0d81b14b2b9242faf8c68b16685bee85031682e8`, com frontend e API confirmados em produção nesse mesmo commit. O registro abaixo preserva a preparação e acrescenta o resultado remoto.

## Artefato e validação local

Branch `agent/codex/personal-workout-implementation`, implementação revista até `66ff87b`; main `677eb3d` integrada por merge normal `25fdf65136fb8d517ba39ee5c65122b9cf9b38a4`. Foram preservadas as correções de reautenticação e histórico de avaliações da main e a elaboração manual/guard de rascunhos da nova implementação. Nenhum arquivo de API, schema, migration original, pacote, CI ou configuração de deploy foi alterado pela integração.

Validação da árvore integrada: web **87 arquivos/666 testes**, tipos e lint aprovados; builds novos de API e Next webpack/TypeScript/postbuild aprovados; navegador real **6 specs/32 casos**, todos aprovados, sem pulados ou pendentes. Prova de aplicação: digest `338433f15fd514596cd669215d5e77b7849ea8b0cd1d931d7f8ea59472c68ae4`, BUILD_ID `3I5WFmIssic_lknQpjyzq`. A retomada do navegador conferiu essa prova antes do reuso; a execução interrompida anterior permanece parcial. API737 e PostgreSQL243 são gates anteriores retidos porque a árvore API é idêntica; o CI remoto verificará o PR.

## Migração antes do merge/publicação da API

Alvos existentes confirmados pelo repositório e pelos conectores: Render `srv-d8fmspjbc2fs73brg8p0`, workspace `tea-csp94gjgbbvc73f22n4g`; Vercel `prj_Q4HElpVnkrbUVlogPwTtUCjbosot`, team `team_dZDG74Q7p84iPA3vUvtE1E8A`; Supabase `zmjcxysenzrqycktckip`. A API publica automaticamente a main. Seu start usa `npx prisma migrate deploy && node dist/src/main.js` com checker restrito; não receberá credencial de owner.

Preflight de produção, somente metadados: 19 migrations concluídas, incluindo a prescrição avançada; nenhuma falha não revertida. Faltam somente `20261017120000_workout_drafts`, `20261017123000_workout_draft_client_index` e `20261017130000_exercise_demonstrations`. Tabela/colunas novas ausentes. As três adições são compatíveis com a API anterior; não reescrevem fichas antigas.

[Payload revisável](sql/2026-10-21-personal-release.sql), SHA-256 `b33220be20f5ea138d23cde2d3ca58a73266da50985ef0d87491921675e9e391`. Aplicar uma vez pelo `apply_migration` do conector Supabase no projeto acima, nome `personal_workout_drafts_demonstrations_prisma_sync`, após revisão/checks do PR e antes do merge que dispara a API. O arquivo contém uma única instrução DO: guarda de owner/database, lock transacional Prisma72707369 e histórico, baseline exato observado, pré-requisitos/ausência dos novos objetos, três corpos DDL e só então três registros concluídos no histórico Prisma. Remove somente BEGIN/COMMIT externos do primeiro arquivo para a execução dentro do DO; registra os SHA originais completos. Nenhuma migration versionada original é editada.

A atomicidade da instrução DO garante DDL e registros Prisma juntos, sem depender de transação implícita do endpoint hospedado. O Supabase registra separadamente a operação do conector; após erro/timeout, consultar ambos os históricos e catálogos antes de decidir qualquer nova ação. Não repetir cegamente: o payload rejeita replay ou estado parcial. Não marcar SQL não aplicado como concluído, apagar histórico revertido, alterar as roles de runtime ou acrescentar owner ao serviço HTTP.

Cinco checksums históricos diferem dos arquivos LF locais. Quatro são variantes CRLF comprovadas; o checksum concluído da migration de tenant é o mesmo documentado na recuperação de outubro, distinto do registro antigo revertido. O guard fixa os 19 pares reais observados, preservando-os. Somente as três novas migrations recebem os seus SHA originais atuais. Isso não corrige ou reescreve o histórico anterior.

Verificação isolada em PostgreSQL16 local, sem dados clínicos: schema e metadados Prisma copiados para duas bases aleatórias; falha forçada após DDL e inserts reverteu tudo para19, sucesso chegou a22, replay falhou fechado e Prisma7.10 retornou No pending migrations sem warnings. As bases temporárias foram removidas; fixture e roles compartilhadas preservadas. Produção usa PostgreSQL17; confirmação remota de histórico, objetos e ACLs permanece obrigatória após execução.

## Verificação remota

Depois da migração: 22 migrations concluídas, três novos SHA corretos, histórico anterior intacto, nenhuma falha não revertida; tabela/enums/sete colunas/índices/FKs/checks/RLS/ACLs conferidos por catálogos. Depois do merge: todos os checks do PR, Vercel READY e Render live no commit integrado; log de startup sem migrations pendentes. Probes sem sessão: /api/ping com pong, biblioteca/rascunhos exigindo autenticação; nenhuma consulta ou escrita clínica para smoke test.

Evidências locais preservadas em `.superpowers/artifacts/personal-release-2026-10-21/`: relatório e logs da integração, inspeção de baseline, prova de rollback/replay e compatibilidade Prisma. Não contêm credenciais de produção nem conteúdo de prontuário. Evidências anteriores da implementação continuam nos runbooks de rascunhos e biblioteca visual.

## Resultado remoto confirmado

- CI do PR: [execução 39687518297](https://github.com/Gustavo13Cs/ecossistema-resiliencia/actions/runs/39687518297), quatro jobs aprovados, incluindo API unitária/E2E e Cypress. Preview Vercel aprovado. Revisão independente da integração/payload aprovada sem achados.
- Migração aplicada uma vez, antes do merge, em 21/10/2026 às 22:38:53 UTC; operação Supabase `20261021223853`. Readback exato das 22 migrations, com os 19 pares anteriores e o registro revertido preservados, nenhuma falha pendente e os três novos checksums corretos. Tabela, 13 colunas próprias mais sete adições, enums, políticas, cinco índices e dez constraints conferidos. Role clínica com CRUD; demais papéis sem privilégios na nova tabela; checker limitado a SELECT no histórico. Auditoria independente do readback aprovada; Security Advisor sem lints.
- Merge normal do PR em `0d81b14`, às 22:40:53 UTC. A árvore integrada é idêntica à árvore revisada da branch `bbef3e6`, conferida por diff vazio.
- Vercel de produção `dpl_GWeR2pKg5g9AnYpW17LViyiTvUio`: READY, SHA `0d81b14`, domínio `ecossistema-resiliencia.vercel.app` atribuído.
- Render `dep-dbcjutrm8hqs73adctag`: live no mesmo SHA, concluído às 22:42:37 UTC. Startup registrou `No pending migrations to apply.` e `Nest application successfully started`; as sete rotas de rascunho foram registradas. Credenciais e configuração de runtime não foram alteradas.
- HTTP pelo domínio de produção: `/auth/login` 200 com HTML, `/api/ping` 200 com `pong`, `/api/workouts/exercise-library` e `/api/workouts/drafts` 401 sem sessão. O campo `success:false` do conector nas respostas 401 indica o HTTP esperado, não falha da publicação.

Evidência de conclusão: subdiretório `production/` do arquivo de release, com readbacks somente de metadados, consulta de pós-verificação, revisões, CI e resumo sanitizado de deploy/HTTP/startup. As jornadas autenticadas foram verificadas no ambiente isolado; o smoke remoto não leu nem escreveu conteúdo clínico. Este registro documental posterior ao deploy fica na branch da entrega e no PR; não altera o commit de aplicação já publicado na main. Branch/worktree preservadas.
