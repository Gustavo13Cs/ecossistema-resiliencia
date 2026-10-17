# Personal — rascunhos e revisões de treino

Data: 17/10/2026. Estado: especificação escrita para revisão do usuário.
Direção de produto aprovada em conversa em 17/10/2026.
Base de código: `e33f9c7`; [proposta aprovada](../../planning/2026-10-17-personal-proxima-entrega.md).

## 1. Resultado esperado e limites

O Personal começa ou revisa uma prescrição, salva uma elaboração incompleta no servidor e a retoma depois. A prescrição ativa só muda quando o profissional finaliza explicitamente uma ficha válida. O histórico continua legível pelo ID selecionado.

Jornada de aceite: abrir aluno → criar ou revisar treino → salvar rascunho → recarregar → continuar → finalizar → consultar nova ficha e ficha anterior.

Somente a conta do Personal opera o fluxo. O aluno permanece um Client privado. Esta entrega não depende da fonte de fotos/vídeos e não inclui modelos independentes, documentos avançados, sessões, evolução, financeiro ou acesso do aluno. A [biblioteca visual](2026-10-17-personal-biblioteca-visual-design.md) tem especificação separada.

## 2. Decisão de arquitetura

Manter `Workout`, `WorkoutSplit` e `WorkoutExercise` como prescrições finalizadas, com os contratos de leitura existentes. Criar uma entidade `WorkoutDraft` para a elaboração. Não misturar fichas incompletas com a consulta de treino ativo ou com as contagens do painel.

Comparação: colocar estado DRAFT no Workout exige adaptar imediatamente todas as leituras e suas policies; usar somente memória mantém a perda de trabalho ao fechar a página. A entidade separada preserva o fluxo atual de prescrições e concentra validação parcial e concorrência em um domínio próprio.

Implementação no `WorkoutsModule`, com serviço e DTOs específicos de rascunho; reutilizar contexto transacional, ClientAccessService, editor, biblioteca e componentes atuais. Nenhum PrismaClient paralelo ou conexão privilegiada.

## 3. Experiência

- `/clientes/:id/novo-treino` oferece começar do zero ou usar o treino ativo como base. Havendo rascunho aberto, prioriza “Continuar rascunho”; nunca o substitui silenciosamente.
- “Revisar esta ficha”, na consulta pelo workoutId, cria uma cópia da ficha selecionada. Se já há rascunho, oferecer continuar ou descartar explicitamente antes de começar outro.
- Começar do zero abre o editor sem gravar automaticamente. O primeiro “Salvar rascunho” cria o registro e navega para `/clientes/:id/rascunhos/:draftId`, preservando a elaboração em caso de erro. Escolher explicitamente uma ficha como base cria o rascunho no servidor naquele momento e abre essa rota; edições posteriores usam PUT. Não enviar sourceWorkoutId junto com conteúdo já editado.
- “Salvar rascunho” aceita conteúdo incompleto. Título vazio aparece como “Rascunho sem título” apenas na apresentação; não vira título clínico salvo.
- “Finalizar prescrição” exige validade completa e confirmação da substituição do treino ativo. Salvar primeiro é obrigatório: com alterações locais, a ação salva a revisão atual e só finaliza se esse salvamento terminar com sucesso. Não continuar após conflito.
- Mostrar “Alterações não salvas”, “Salvando” e “Rascunho salvo às …” conforme o resultado real, no fuso do navegador. Nesta entrega o salvamento é manual, sem autosave prometido.
- Sair com alterações posteriores ao último salvamento pede confirmação de descarte. O rascunho já salvo permanece no servidor.
- A seção “Rascunhos” em `/treinos` mostra aluno, título e atualização, com “Continuar” e “Descartar”. Paginação de 20 itens, ordenação `updatedAt desc, id asc`, separada das fichas prescritas.
- Prontuário mostra rascunho aberto e treino ativo como recursos distintos. Aluno arquivado permite consultar a elaboração salva, com ações de escrita desabilitadas.
- Consulta de rascunho não oferece impressão como se fosse prescrição finalizada.

Reutilizar design system; suportar teclado, foco visível, nomes acessíveis, confirmação por diálogo e celular sem rolagem horizontal obrigatória.

## 4. Modelo de dados proposto

### WorkoutDraft — nova tabela `workout_drafts`

| Campo | Regra |
| --- | --- |
| `id` | UUID gerado no servidor. |
| `professionalId`, `clientId` | Dono derivado da sessão e aluno pertencente à conta. FKs com exclusão restrita. |
| `status` | Enum OPEN, FINALIZED ou DISCARDED. |
| `schemaVersion` | Inteiro 1 nesta entrega; versão do formato do conteúdo, não do treino. |
| `content` | JSON validado e normalizado enquanto OPEN; nulo após finalização/descarte. |
| `version` | Inteiro iniciado em 1; incrementado em cada mutação aceita. Controle de concorrência, não número clínico de versão. |
| `sourceWorkoutId` | FK opcional para a ficha copiada; validada como do mesmo aluno e profissional. |
| `baseActiveWorkoutId` | ID opcional do treino ativo confirmado ao iniciar; referência verificada pelo servidor, não escolhida livremente pelo corpo. |
| `finalizedWorkoutId` | FK opcional e única para o Workout produzido. Permite recuperar resultado após timeout. |
| `createdAt`, `updatedAt`, `closedAt` | Datas do servidor; fechamento apenas em estado terminal. |

No máximo um OPEN por aluno e profissional, garantido por índice único parcial. Índice adicional para listagem por dono, estado, atualização e ID. Estado terminal é preservado como metadado de idempotência; não é uma segunda cópia permanente da prescrição.

Checks SQL: OPEN tem content não nulo, closedAt/finalizedWorkoutId nulos; FINALIZED tem content nulo, closedAt/finalizedWorkoutId preenchidos; DISCARDED tem content nulo, closedAt preenchido e finalizedWorkoutId nulo. `version` e `schemaVersion` positivos.

### Workout — adições

- `finalizedAt`: data opcional. Novas finalizações e criações diretas recebem data do servidor; registros existentes permanecem nulos, sem backfill de uma data presumida.
- `revisionOfId`: FK opcional para a ficha que deu origem à revisão; mesma conta/aluno. Sem cascade delete.

O ativo continua representado por `isActive`. Não criar uma numeração retroativa para fichas antigas. Na leitura, registro antigo recebe “Registro legado”; novo recebe data de finalização. O vínculo `revisionOfId` permite percorrer a origem, sem afirmar uma sequência clínica completa para o legado.

## 5. Conteúdo e validação

`content` contém somente título, objetivo, duração, observações, divisões e exercícios compatíveis com o editor atual. IDs locais do editor não se tornam IDs de banco; ordem vem dos arrays. Não aceitar operações Prisma, autoria, clientId aninhado ou propriedades desconhecidas.

Rascunho permite título/nome/séries/repetições vazios, nenhuma divisão e divisões vazias. Campos tipados, quando preenchidos, continuam respeitando enums, limites e formatos atuais; um alvo de esforço pode ficar pendente do tipo até a finalização. Conteúdo inválido estruturalmente não é salvo.

Manter os máximos existentes: título/divisão/exercício de 200 caracteres, objetivo de 1000, notas gerais de 5000, foco de 500, notas de exercício de 2000, séries/repetições/descanso/carga de 100, esforço/cadência de 20; até 30 divisões e 100 exercícios por divisão. Duração preenchida entre 1 e 104 semanas. Limite adicional de 64 KiB para o JSON normalizado: excesso retorna 413 e mantém o trabalho local. Informar esse limite no editor quando atingido.

Finalização reutiliza as regras de CreateWorkoutDto e do formulário: título e nomes não vazios após trim, pelo menos uma divisão e um exercício válido por divisão, séries/repetições preenchidas e par esforço/tipo consistente. Erros de campo retornam 400 antes de substituir qualquer plano.

## 6. Contratos HTTP

Todos exigem JWT, papel PERSONAL, ownership e classificação ClinicalResponse. UUIDs validados. Registrar rotas específicas antes de `GET /workouts/:workoutId`.

| Método e rota | Entrada e resultado |
| --- | --- |
| `GET /workouts/drafts?clientId=&cursor=&limit=` | Somente OPEN. `clientId` opcional; limite padrão/máximo 20. `{ items, nextCursor }`; cada item inclui clientId, resumo e version, sem carregar o JSON. |
| `POST /workouts/drafts` | `{ clientId, sourceWorkoutId?, content? }`. Cria OPEN com base ativa atual; 201 com recurso completo. Source e content não podem coexistir: com source, servidor copia a ficha; sem source, content é obrigatório. |
| `GET /workouts/drafts/:draftId` | Recurso com clientId, status, version, base, origem e content se OPEN; terminal inclui finalizedWorkoutId quando houver. |
| `PUT /workouts/drafts/:draftId` | `{ expectedVersion, content }`. Substitui conteúdo de OPEN e incrementa version. Não altera a base ou a origem. |
| `POST /workouts/drafts/:draftId/rebase` | `{ expectedVersion, expectedActiveWorkoutId }`. Após aviso e confirmação no editor, atualiza a base para o ativo atual, se ainda corresponder ao ID confirmado. Não altera conteúdo. ID pode ser null. |
| `POST /workouts/drafts/:draftId/finalize` | `{ expectedVersion }`. Valida versão, base ativa e conteúdo; cria Workout em transação; retorna a ficha finalizada e o estado terminal. |
| `POST /workouts/drafts/:draftId/discard` | `{ expectedVersion }`. Encerra OPEN explicitamente, limpa content e incrementa version; retorna ack com id, clientId, status e version. |

Criação com rascunho aberto retorna 409 com o ID do próprio rascunho existente. Falta de ownership retorna 404 sem revelar dados de outra conta. Version inválida, estado terminal incompatível, aluno arquivado e base alterada retornam 409 com código distinguível e texto sem payload clínico. Listagem usa `resource-page`, recursos e finalização usam `resource`, descarte usa `ack`. Finalização retorna `{ id, clientId, status, version, finalizedWorkoutId, workout }`, com workout no contrato WorkoutDetail; a identidade clínica permanece no topo da resposta.

## 7. Transações, concorrência e compatibilidade

Ordem comum de escrita: resolver ownership → travar Client ativo com helper existente → travar/reler rascunho → conferir versão/estado → gravar. Todas as operações usam a mesma transação clínica do request.

Na primeira gravação, capturar a base ativa sob lock de Client. Na finalização, comparar o ativo atual com `baseActiveWorkoutId` antes de desativá-lo. Mudança desde a elaboração retorna `ACTIVE_WORKOUT_CHANGED`; o editor mostra a ficha atual e oferece confirmação explícita de rebase. Uma segunda alteração durante essa confirmação causa novo conflito. Não existe modo de forçar finalização ignorando a base.

Após validar, desativar o anterior, criar Workout e filhos ordenados, vincular revisionOfId/finalizedAt e encerrar o rascunho atomicamente. Falha em qualquer passo preserva ativo e rascunho. A transação serializa com arquivamento e com o POST legado que usa o mesmo lock.

Repetir finalize de um FINALIZED com a mesma versão de entrada que efetivamente o finalizou (`version terminal = expectedVersion + 1`) retorna o mesmo finalizedWorkoutId, sem novo Workout. Outras versões recebem conflito. Se a resposta se perder, GET do rascunho recupera o resultado. Descarte pode ser repetido sob a mesma regra; descartar um FINALIZED retorna 409.

Preservar `POST /workouts` para consumidores existentes: validação completa, lock e substituição atômica, com finalizedAt. O editor web passa a usar rascunho/finalização. Preservar endpoints de leitura e adicionar os campos novos sem remover os atuais.

`DELETE /workouts/:id` passa a recusar exclusão de toda prescrição vinculada a Client, inclusive legado, com 409 e orientação de criar revisão. Registros de modelos legados independentes mantêm o tratamento atual até o lote de modelos. `save-as-template` conserva somente a marcação legada e nunca altera o conteúdo de ficha; não anunciar isso como biblioteca independente.

Conteúdo de Workout e filhos finalizados não é editável por endpoint desta entrega. Reativação de ficha antiga não é oferecida; usar revisão gera nova prescrição.

## 8. Segurança, cache e estados

- RLS da nova tabela exige profissional da sessão e Client pertencente à conta. Validar também FKs de origem/base/finalizado no serviço; não confiar apenas em filtros da interface.
- Grants mínimos do papel clínico; nenhum grant a PUBLIC/Data API/auth/jobs. Manter checks de role e policies negativas existentes. Não usar exceção de catálogo para conteúdo de rascunho.
- Projeções devolvem clientId para o validator clínico. Paginação limita resposta; sem logs de conteúdo ou persistência em localStorage/sessionStorage.
- Chaves incluem `user.sub`, aluno e draftId. Invalidar listagem de rascunhos/prontuário após save/discard; após finalize invalidar também workspace, treinos, ativo, overview e ficha produzida.
- Save de uma versão não invalida o formulário com uma resposta atrasada: marcar como salvo somente o conteúdo enviado, preservando alterações digitadas durante o request.
- 401/403 removem conteúdo utilizável; não recuperar rascunho em sessão de outra conta. 404 mostra indisponibilidade. Falha comum preserva texto em memória e oferece retry; conflito não sobrescreve o servidor.

## 9. Alterações protegidas e rollout

Esta especificação propõe alterações de `api/prisma/schema.prisma` e uma migration aditiva para tabela/enum/índices/checks/RLS e as duas colunas de Workout. Revisão humana dessas mudanças é exigida pelo AGENTS.md, seção 8; nenhum arquivo protegido foi alterado ao escrever este documento.

Aplicar e verificar primeiro em PostgreSQL sintético. A migration não reclassifica registros antigos nem muda isActive. A nova API deve manter leitores antigos funcionais. Produção exige a rotina de publicação e backup do repositório; escrever a especificação não autoriza aplicar migration ou publicar.

## 10. Aceite e evidência esperada

1. Elaboração vazia/incompleta salva, reabre com ordem e todos os parâmetros; ativo não muda.
2. Finalização inválida falha com campos identificados, sem alteração parcial.
3. Finalização válida cria uma ficha ativa; original e revisões continuam consultáveis por ID.
4. Dois saves do mesmo version: somente um grava. Dois creates: no máximo um OPEN.
5. Duas finalizações, retry após timeout e criação direta concorrente não duplicam ativo ou resultado; base alterada exige confirmação.
6. Arquivamento concorrente bloqueia save/rebase/finalize/descarte; leitura continua. Descartar exige restaurar o aluno.
7. Segundo Personal, Nutrição, Fisioterapia e IDs de outro aluno não leem nem escrevem conteúdo alheio. RLS é testada diretamente com papel clínico, não só por controller.
8. Exclusão física de ficha vinculada a aluno retorna 409 e mantém histórico. Legado conserva IDs, conteúdo, datas e atividade.
9. E2E real: cadastrar aluno → salvar incompleto → recarregar → preencher → finalizar → revisar → finalizar → reabrir ambas as fichas; sem login de aluno ou mocks nos serviços principais.
10. Testes unitários e PostgreSQL de concorrência/rollback, regressões dos leitores atuais, tipos, lint, builds e Cypress do fluxo. Inspeção final desktop/celular e teclado conforme AGENTS.md.

## 11. Revisão desta especificação

Autorrevisão: escopo limitado ao ciclo de prescrição; separação entre version técnico e histórico clínico; contratos, legado, estados terminais, conflitos, proteção de dados e rollout definidos. Nenhuma execução de testes de produto é declarada nesta etapa documental.

Próximo passo: revisão do usuário deste arquivo, seguida de plano técnico de implementação. A biblioteca visual pode ser planejada separadamente após sua própria especificação ser revisada.
