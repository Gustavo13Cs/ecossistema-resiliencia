---
tags:
  - safemove
  - personal
  - especificacao
status: aguardando-revisao-escrita
date: 2026-10-14
---

# P1 — Painel de trabalho e prontuário do Personal

**Direção:** roadmap e uso exclusivo pelo Personal aprovados em conversa em 14/10/2026.
**Estado deste documento:** especificação escrita para revisão; implementação não iniciada.
**Referência:** [[docs/planning/2026-10-14-personal-diagnostico-e-roadmap|Diagnóstico e roadmap do Personal]].

## 1. Resultado esperado

O Personal usa o SafeMove para organizar sua base de alunos, consultar os compromissos do dia e trabalhar no prontuário. Ao abrir um aluno, encontra o contexto de treinamento, a avaliação registrada e o treino ativo; consegue iniciar uma avaliação e criar uma prescrição a partir dali.

Somente o Personal opera a área. O aluno é um `Client` privado, sem conta, acesso ao site, convites, portal ou tarefas de preenchimento. Presencial e consultoria online são modalidades de atendimento administradas pelo profissional.

**Jornada de aceite:** entrar como Personal → cadastrar aluno → registrar avaliação, inclusive somente de força → prescrever treino → voltar ao prontuário → consultar a ficha salva pelo seu ID → localizar o compromisso na agenda.

## 2. Base de execução e dependências

- Documentação preparada em `agent/codex/personal-planning`, sobre checkout `934e183`.
- `git ls-remote` confirmou em 14/10/2026 que a main remota está em `37a174df176228eca297311db1337aaf68c4032a`. Esse commit e suas fontes estão disponíveis localmente.
- A implementação deve começar de `origin/main` vigente em um checkout isolado, verificando novamente o HEAD. Não construir P1 sobre a base antiga nem trazer arquivos antigos de Prisma/auth por cópia.
- As fontes do dashboard, prontuário, modal de avaliação, editor de treinos e navegação consultadas não tiveram diferenças entre os dois commits. Os controllers passaram a classificar respostas clínicas; a API atual usa contexto transacional de profissional e RLS.
- Preservar `JwtAuthGuard`, `RolesGuard`, `ClinicalResponse`, `ClinicalContextInterceptor`, `PrismaService`, ownership, sanitização de erros e `Cache-Control: no-store`.
- P1 não exige alterações de schema, migrations, segredos, CI, deploy ou `PRODUCT.md`.

O status antigo de segurança no checkout é histórico e não demonstra o estado da main atual. A consulta desta tarefa confirmou código/referência Git; não revalidou implantação ou banco de produção.

## 3. Escopo fechado

| Incluído | Entrega concreta |
|---|---|
| Visão geral própria | Agenda do dia, resumo da base, alunos sem treino ativo e alunos recentes. |
| Prontuário de treinamento | Ações específicas, avaliação recente e ficha ativa junto do contexto já cadastrado. |
| Avaliação adequada ao Personal | Registro sem obrigar peso quando houver outra medida; unidades explícitas; texto pertinente a treinamento. |
| Consulta fiel de treino | Abrir pelo ID selecionado e mostrar o conteúdo salvo, incluindo registros anteriores. |
| Prescrição existente integrada | Começar do zero ou copiar explicitamente o treino ativo; salvar usando a API existente. |
| Estados e autorização | Carregamento, vazio, falha parcial, acesso negado, arquivamento e cache por profissional. |

Ficam para outros lotes: anamnese estruturada nova; novos parâmetros de prescrição; biblioteca de exercícios; modelos independentes; rascunhos persistidos; versões imutáveis; diário de execução; metas estruturadas; periodização; PDF avançado e integrações de envio.

P1 não usa alertas derivados de `DailyTracking`. Tampouco calcula adesão, platô, excesso de treino, vencimento ou atraso de reavaliação sem registros próprios que sustentem esses indicadores.

## 4. Telas e comportamento

### 4.1 Visão geral (`/home`, papel PERSONAL)

Preservar o shell e o design system atuais. O conteúdo principal será uma composição de trabalho, com esta ordem de leitura:

1. Cabeçalho “Área de treinamento”, data e ação “Novo aluno”. Ações secundárias: “Nova prescrição” e “Abrir agenda”.
2. “Compromissos de hoje”: horário, aluno, tipo, modalidade e situação. Mostrar compromissos não cancelados em ordem de início, com limite visual de cinco e acesso à agenda completa. Compromissos concluídos e faltas mantêm sua situação explícita; um compromisso não é prova de execução do treino.
3. Resumo com “Alunos ativos”, “Alunos arquivados” e “Alunos sem treino ativo”. Contagem sempre vem de consulta autorizada à API.
4. “Alunos sem treino ativo”: até cinco alunos ativos, com acesso ao prontuário e ação “Criar prescrição”.
5. “Alunos recentes”: até cinco alunos ativos, ordenados por atualização cadastral, com objetivo informado. Chamar esses registros de recentes, sem afirmar que representam atendimentos recentes.

“Nova prescrição” abre seleção de aluno ativo da base privada e conduz a `/clientes/:id/novo-treino`. Reutilizar o diretório de Clients; não buscar antigos usuários PATIENT.

Se não há alunos ativos nem arquivados, mostrar a sequência de ativação “Cadastrar aluno → Registrar avaliação → Criar treino”, com “Novo aluno” como primeira ação habilitada. A agenda mantém seu próprio estado de consulta. Uma base composta somente por arquivados mostra o acesso aos arquivados e uma ação de cadastro, sem a mensagem de conta nunca utilizada.

O período do dia usa o fuso do navegador, obtido após a montagem, e os helpers existentes `getDateKeyInTimeZone`/`getAppointmentPeriod`. Em um navegador configurado para São Paulo, o dia é calculado em `America/Sao_Paulo`. Não fixar o fuso do servidor nem consultar o período provisório antes de resolver o calendário. Recalcular ao voltar à aba e ao mudar o dia.

### 4.2 Prontuário (`/clientes/:id`, papel PERSONAL)

Manter cabeçalho, contato, objetivo, atualização cadastral e arquivamento existentes. Acrescentar:

- Ações “Nova avaliação física”, “Criar prescrição” e “Abrir agenda”. O acesso à agenda pode usar a página existente; não promete abrir automaticamente um atendimento específico ou filtrado sem suporte implementado.
- “Treino ativo”: título, objetivo, data do registro e duração informada em semanas. “Ver ficha” abre o ID dessa prescrição. Sem treino: texto “Nenhum treino ativo registrado” e ação de criação.
- “Avaliação mais recente”: data, medidas disponíveis e resultados de força registrados. Ausência de informação aparece como “Não registrado”.
- “Avaliações registradas”: consulta das medidas existentes para esse Client usando o endpoint autorizado. P1 não apresenta gráficos que dependam de unidade ou protocolo ainda desconhecidos.
- Contexto de treinamento e anotações privadas já cadastrados, sem renomeá-los como anamnese estruturada completa.

Remover somente no ramo PERSONAL o `ProfessionalScopePanel` que afirma que treino ainda está em migração. Nutrição e Fisioterapia mantêm suas composições.

Carregar primeiro o Client autorizado. Somente depois montar as consultas do domínio de treinamento. Não chamar o overview multidomínio, endpoints de dietas/exames/reabilitação ou `/users/:id` para montar este prontuário.

Para Client arquivado, manter leitura do cadastro, avaliações e prescrições e indicar seu estado. O fluxo P1 desabilita novas avaliações/prescrições; o backend também deve impedir essas escritas, inclusive por URL direta, conforme a regra de ciclo de vida definida na seção 7.

### 4.3 Avaliação física

Adaptar o comportamento do modal para PERSONAL, preservando o uso das outras atuações. Usar o padrão acessível de diálogo existente: foco contido, fechamento por Escape, restauração do foco e nome de cada campo associado ao seu controle.

- Campos opcionais: peso em kg; gordura corporal em %; perímetros em cm; dobras em mm; supino/agachamento/terra 1RM informado em kg; observações.
- Habilitar salvar quando ao menos uma medida numérica válida estiver preenchida. Uma avaliação de força não exige peso. Observação isolada não substitui registro de avaliação.
- Remover exemplos sobre alimentação. Orientação do campo: “Registre observações relevantes para esta avaliação”.
- Omitir `muscleMass` e `vo2Max` do novo formulário do Personal em P1: o modelo atual não registra a unidade desses campos. Valores históricos permanecem preservados e podem aparecer somente como “unidade não registrada”, sem gráfico, conversão ou comparação.
- Exibir resultados de 1RM como informados pelo profissional; não afirmar protocolo de teste, medição direta ou estimativa automática que o registro não identifica.
- Validação de entrada: valores finitos; peso/perímetros/dobras/força maiores que zero; porcentagem de gordura entre zero e cem. Isso valida o formato do registro, sem emitir interpretação clínica.
- Enviar `clientId` e somente campos preenchidos. Campo vazio não vira zero.

O servidor mantém a autorização por proprietário e valida as entradas usadas pelo fluxo, sem depender apenas da validação do formulário. Alterações no DTO/serviço compartilhados exigem regressão das outras atuações e do caminho legado ainda autorizado.

### 4.4 Treinos: consulta e criação

Na navegação do Personal, trocar “Planilhas” por “Treinos”. Manter `/treinos` como listagem real.

**Consulta:** criar `/clientes/:clientId/treinos/:workoutId`, em modo de leitura. Mostrar título, objetivo, duração, data, situação ativa/anterior, divisões e exercícios com os campos salvos. A listagem e o prontuário levam a essa rota, e não ao editor do treino ativo.

**Criação:** `/clientes/:id/novo-treino` começa sem objetivo, exercício, séries ou carga de exemplo. “Treino A” pode ser apenas o nome estrutural inicial. Em branco, não é possível finalizar até existir título, pelo menos uma divisão e pelo menos um exercício válido em cada divisão.

Quando há treino ativo, oferecer “Começar do zero” ou “Usar treino atual como base”. Copiar precisa ser uma ação explícita; título e exercícios copiados continuam editáveis. Informar antes da gravação que salvar a nova prescrição substituirá o treino ativo, conservando o registro anterior.

Salvar continua sendo `POST /workouts`: criação dos filhos e substituição do ativo em transação. Não anunciar “salvar rascunho”, edição de versão imutável ou aplicação de modelo. Falha mantém o editor e os dados em memória para nova tentativa, sem mensagem de sucesso. Ao sair com alterações, pedir confirmação de descarte; não persistir o conteúdo no navegador.

A tela de consulta pode oferecer “Imprimir ficha salva”, usando impressão do navegador e o conteúdo retornado para esse ID. Não chamar essa ação de geração dedicada de PDF. Remover o botão sem ação de WhatsApp do editor. A criação de documento avançado pertence a P4.

Não acrescentar controles de reordenação em P1. O schema atual não persiste posição das divisões/exercícios; a consulta exibe a ordem recebida sem prometer uma sequência histórica que nunca foi gravada. Persistência de ordem será especificada em P3. Nenhum registro existente será reescrito para inventar essa posição.

## 5. Contratos de leitura

Acrescentar contratos ao `WorkoutsModule`, já montado, preservando o contexto clínico vigente. Isso evita alterar o overview comum e suas responsabilidades de outras atuações.

| Endpoint | Finalidade | Classificação |
|---|---|---|
| `GET /workouts/workspace` | Contagens e amostras autorizadas para o dashboard. | `ClinicalResponse({ shape: 'resource-page' })` |
| `GET /workouts/client/:clientId/overview` | Avaliações recentes e treino ativo do aluno. | `ClinicalResponse({ shape: 'overview' })` |
| `GET /workouts/:workoutId` | Conteúdo exato de uma ficha pertencente ao profissional. | `ClinicalResponse({ shape: 'resource' })` |

Registrar as rotas específicas antes da rota genérica de ID. Todos os handlers exigem autenticação e papel PERSONAL; IDs de Client/Workout devem ser UUIDs válidos. Respostas usam datas ISO e ausência explícita por `null`/lista vazia.

### 5.1 Workspace

Contrato:

```text
counts: { activeStudents, archivedStudents, withoutActiveWorkout }
items: [
  { clientId, name, goal, updatedAt, section: RECENT | WITHOUT_ACTIVE_WORKOUT }
]
```

- `items` reúne até cinco entradas por seção, total máximo de dez. Um aluno pode aparecer em ambas; são duas amostras com finalidades distintas. Cada linha tem `clientId` para validação pela política clínica existente.
- Contagens e itens usam `professionalId` derivado da identidade autenticada.
- “Sem treino ativo” significa Client ACTIVE da conta sem Workout com `creatorId` igual ao profissional, mesmo `clientId` e `isActive: true`. Um treino do aluno que também esteja marcado como modelo legado ainda conta como treino ativo; template sem Client não conta.
- Contar alunos, não quantidade de prescrições. Não carregar cada prontuário para calcular o dashboard.
- Amostras ordenadas por `updatedAt desc`, com `id asc` como desempate. Contagens são independentes do limite de cinco.
- A resposta é um retrato operacional da consulta, sujeito a mudanças concorrentes; não equivale a relatório histórico fechado. Não aumentar a isolação por transação aninhada.
- Não incluir contato, patologias, notas privadas ou conteúdo de treino nas amostras.

### 5.2 Overview de treinamento

Contrato: `client: { id, status }`, `activeWorkout` ou `null`, `recentAssessments` com até duas avaliações. Todo recurso retorna seu `clientId`; a projeção de avaliação inclui data, medidas do treinamento disponíveis e observações pertinentes.

Resolver primeiro `ClientAccessService.getOwnedClient`. Consultar somente Workout do Client com autoria do Personal e PhysicalAssessment do Client autorizado. Nenhum delegate de Nutrição, exames ou Fisioterapia é chamado. O validator existente confere `client.id` antes da resposta; queries internas continuam explicitamente restritas.

### 5.3 Ficha por ID

Consultar Workout pelo ID e autoria profissional, validar a propriedade do Client associado e retornar seu conteúdo. A rota aninhada de frontend também verifica que o `clientId` retornado é o solicitado; ID do treino de outro aluno da mesma conta não será apresentado dentro de um prontuário incorreto.

Treino inexistente, de outra conta, independente de Client ou associado a outro Client solicitado recebe estado indisponível. API mantém resposta 404 para ausência/ownership. A leitura permite Client arquivado. O endpoint não converte templates independentes em prescrições de aluno.

Incluir `isActive` e `updatedAt` no contrato de consulta/listagem para distinguir ativo e anterior. Não inventar número de versão; P1 ainda usa os registros existentes.

## 6. Hooks, cache e estados

- Componentes específicos em `web/components/features/training/`; hooks em `web/hooks/features/`; tipos em `web/types/`.
- Chaves de query para workspace, overview e ficha incluem `user.sub`; overview inclui Client e ficha inclui Client/Workout. Não usar chave clínica global ou storage persistente.
- Encerrar/remover os dados da sessão anterior ao trocar conta. Abort/cancelamento impede resposta atrasada de reaparecer na nova sessão ou no aluno seguinte.
- Queries específicas só são habilitadas para PERSONAL e após os pré-requisitos. `ProfessionalRouteBoundary` permite a nova rota aninhada apenas ao Personal antes de montar consultas.
- Salvar treino invalida workspace, listagem, overview do Client e ficha ativa. Registrar/remover avaliação invalida avaliações e overview. Alterar/arquivar/restaurar Client invalida workspace, cadastro e leituras do prontuário afetado.
- A agenda continua usando as suas chaves e mutations atuais. P1 não duplica seus eventos nem registros.

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton com indicação acessível; nenhuma contagem provisória. |
| Vazio com consulta concluída | Texto específico e ação disponível. |
| Erro de bloco | Exibir indisponibilidade e “Tentar novamente” naquele bloco; preservar os outros blocos que carregaram. |
| 401/403 | Remover conteúdo clínico utilizável da superfície e orientar restabelecimento da sessão/acesso. |
| Client/Workout 404 | Estado indisponível sem revelar proprietário ou existência de recurso alheio. |
| 409 de escrita | Manter dados em memória; mostrar conflito e permitir recarga explícita. |
| Client arquivado | Conteúdo legível e novas ações de treino/avaliação desabilitadas. |

Nenhuma falha de consulta vira zero alunos, lista vazia ou “sem treino”. Erro ao carregar Client/treino base impede finalizar uma prescrição sem contexto confiável. Dados antigos em cache não ocultam falha de autorização.

## 7. Ciclo de vida e fronteiras

- O fluxo de P1 exige Client ACTIVE para criar treino ou avaliação. A checagem precisa ocorrer no servidor junto da escrita, depois de resolver propriedade, e não somente no estado do botão.
- Treinos: manter o lock existente de Client, verificar o estado atual dentro da transação e recusar escrita com 409 se arquivado. Uma falha preserva o treino ativo anterior.
- Avaliações: alinhar criação de avaliação vinculada a Client à mesma regra de prontuário arquivado. Por ser um serviço compartilhado, testar explicitamente Nutrição/Fisioterapia. Essa alteração de ciclo de vida é intencional; não modificar a autorização de atuação nem liberar módulos nutricionais.
- Serializar verificação/escrita com arquivamento na mesma linha de Client. Na main atual, reutilizar a conexão/transação do contexto clínico; não criar outro PrismaClient, conexão privilegiada ou contexto de identidade artificial.
- Histórico pode continuar sendo consultado após arquivamento. P1 não elimina prescrições ou avaliações ao arquivar o aluno.
- Nenhuma mudança em RLS ou guards. Proibição de escrita de prontuário arquivado não requer alterar schema.

## 8. Apresentação e acessibilidade

Reutilizar shell claro, acento azul-petróleo, tokens, tipografia e componentes atuais. Adotar os briefs de Home/Agenda já existentes como referência de composição; o novo conteúdo especializa a operação do Personal.

No desktop, agenda e pendências têm prioridade; no celular, cabeçalho, compromissos, resumo e listas aparecem em uma coluna, sem esconder ações essenciais. Tabelas extensas de treino viram grupos legíveis por divisão. Alvos de toque de pelo menos 44 px, foco visível, navegação por teclado e nomes acessíveis.

Adotar pt-BR consistentemente: “Aluno”, “Treino”, “Avaliação física”, “Criar prescrição”, “Salvar prescrição” e datas locais. Não oferecer menus de recursos ainda inexistentes.

## 9. Verificação de aceite

1. Conta Personal sem base mostra cadastro como primeiro passo; base com apenas arquivados recebe estado próprio.
2. Dashboard de dois Personais tem contagens, amostras e agenda isoladas; alunos arquivados não entram nas pendências ativas.
3. Contagem acima de cinco continua correta; amostras têm limite/desempate estável. O dashboard não abre um overview por aluno.
4. Falha somente da agenda ou do workspace aparece no bloco correto. Não é representada como ausência de registros.
5. Prontuário monta somente queries de treinamento/Client/avaliação/agenda pertinentes, sem delegates ou chamadas dos outros domínios.
6. Avaliação somente de força é salva sem peso; vazia, negativa, não finita ou com percentual inválido é rejeitada. Histórico ambíguo não recebe unidade fabricada.
7. Nova prescrição começa sem exemplos. Copiar o ativo exige ação explícita. Falha no POST conserva conteúdo e ativo anterior; duplo envio é impedido.
8. Dois treinos diferentes do mesmo aluno abrem conteúdos próprios por ID. Treino de outro aluno ou outra conta não aparece dentro desse prontuário.
9. Após salvar, cadastro/avaliação/treino reaparecem no contexto correto sem informação clínica em localStorage/sessionStorage.
10. Client arquivado permite leitura e bloqueia novas avaliações/treinos também pela API; corrida de arquivamento e escrita mantém a regra transacional.
11. Papel Nutrição/Fisioterapia/ADMIN/PATIENT não monta a nova área de treino; acessar as novas rotas diretamente respeita o papel e ownership.
12. Troca de conta ou aluno durante request não apresenta conteúdo anterior. Agenda respeita meia-noite/fuso e não consulta um período provisório.

Executar testes unitários dos contratos e hooks afetados, E2E de autorização com banco sintético isolado e Cypress real da jornada do Personal. Conferir os fluxos compartilhados de Nutrição/Fisioterapia, typecheck, lint e builds. Não usar resultados históricos como prova do novo lote.

Inspeção visual final em desktop e celular, com capturas somente ao concluir o fluxo ou encontrar bug visual, conforme `AGENTS.md`.

## 10. Limites conhecidos e próxima etapa

O primeiro lote integra ferramentas existentes e melhora suas ações/estados. Não transforma os treinos atuais em versões imutáveis, não garante ordem histórica inexistente no schema e não completa a cadeia de modelos/entrega avançada.

Após revisão desta especificação, escrever o plano técnico de P1 sobre a main vigente, com unidades de trabalho e comandos de validação. Não executar P2–P6 automaticamente. Nenhum teste de implementação, navegador ou banco foi executado para produzir este documento.
