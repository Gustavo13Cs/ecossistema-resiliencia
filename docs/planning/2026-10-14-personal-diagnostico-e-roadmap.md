---
tags:
  - safemove
  - personal
  - planejamento
  - educacao-fisica
status: proposta
date: 2026-10-14
---

# Personal — diagnóstico e proposta de evolução

## 1. Objetivo e escopo confirmado

Dar ao profissional de Educação Física uma área de trabalho completa para musculação e condicionamento geral, no atendimento presencial e na consultoria online. O usuário confirmou esse recorte em 14/10/2026.

O nível de qualidade da área de Nutrição é a referência para integração, clareza, agilidade e acabamento. Os recursos do Personal devem servir ao planejamento, à prescrição e ao acompanhamento do treinamento.

**Jornada principal:** cadastrar aluno → conhecer o contexto → avaliar → prescrever → entregar o treino → registrar o acompanhamento → revisar a prescrição.

O SafeMove será de uso exclusivo do Personal nesta área. O aluno é um `Client` privado administrado pelo profissional e não terá acesso ao site. A modalidade online significa que o Personal organiza e revisa a consultoria na ferramenta e entrega documentos ao aluno fora do site.

### Regra central — o Personal opera todos os fluxos

Reforço explícito do usuário em 14/10/2026: o site serve para o Personal organizar e executar o que precisa no trabalho. Cada funcionalidade deste roadmap deve ser desenhada para esse operador.

- O Personal cadastra o aluno, coleta e registra a anamnese, realiza e registra avaliações, monta e revisa o treino.
- O Personal organiza agenda, sessões, metas de treinamento, reavaliações, observações e documentos.
- Na consultoria online, o Personal registra as informações recebidas pelos canais de atendimento que já utiliza; o aluno não preenche formulários, diários ou check-ins dentro do SafeMove.
- Acompanhamento e indicadores usam registros administrados pelo Personal, sem depender de interação do aluno com o sistema.
- A entrega ao aluno ocorre por documento, impressão ou compartilhamento manual fora do site. Não criar conta, senha, convite, portal ou link público de prontuário/plano para o aluno neste escopo.

**Critério de produto:** a jornada completa precisa funcionar com apenas a conta do Personal, do cadastro à revisão do acompanhamento.

Este documento contém um diagnóstico verificado por leitura de código e uma proposta de entregas. Não é uma especificação aprovada nem um plano de execução de todas as fases.

## 2. Contexto consultado e limites da verificação

- Vault do Obsidian configurado no próprio repositório `ecossistema-resiliencia`.
- Grafo existente em `graphify-out/graph.json`, atualizado em 28/09/2026, usado como índice de relações. As conclusões abaixo foram conferidas no código atual, porque o grafo pode estar desatualizado.
- Base local consultada: `main`, commit `934e183`; documentação produzida na branch `agent/codex/personal-planning`.
- Complemento na especificação P1: a main remota foi conferida com `git ls-remote` em 14/10/2026 e está em `37a174df176228eca297311db1337aaf68c4032a`. O fluxo de Personal consultado permanece igual; a implementação deve usar essa base vigente e preservar o contexto transacional/RLS e a classificação de respostas clínicas acrescentados desde o diagnóstico inicial.
- Documentos: `PRODUCT.md`, arquitetura, decisões, segurança, backlog, status dos agentes e especificações de fundação profissional e frontend.
- Captura do usuário: registra o estado vazio do dashboard do Personal; não comprova ausência de todos os recursos existentes.
- Não foram executados testes de produto, navegador, HTTP ou consultas ao banco. Não foi conferida a versão publicada em produção.

Notas relacionadas no vault:

- [[docs/DECISIONS|Decisões de arquitetura]]
- [[docs/ARCHITECTURE|Arquitetura atual]]
- [[docs/SECURITY|Segurança]]
- [[docs/superpowers/specs/2026-08-21-profissional-first-cliente-prontuario-design|Fundação profissional e prontuário privado]]
- [[docs/superpowers/specs/2026-08-24-safemove-frontend-profissional-design|Workspace por profissão]]

## 3. O que existe hoje

| Área | Evidência atual | Implicação para o Personal |
|---|---|---|
| Navegação | `professional-workspace.ts` oferece Visão geral, Agenda, Alunos, Avaliações e Planilhas. Nutrição tem também Evolução, biblioteca, modelos, metas, retornos e relatórios. | O Personal tem uma navegação inicial, ainda sem uma jornada equivalente de acompanhamento. |
| Dashboard | `ProfessionalDashboard` mostra estado vazio ou contagens de Clients ativos/arquivados e registros recentes. | A captura corresponde ao estado sem registros. Criar um aluno revela o dashboard genérico, sem uma mesa de trabalho específica de treinamento. |
| Cadastro do aluno | `client-field-policy.ts` já adapta os campos: objetivo, medidas iniciais, contexto de atividade, frequência e duração, entre outros. | Reaproveitar o cadastro e evoluir o contexto específico; `hasPersonal` merece revisão de significado para esta atuação. |
| Prontuário | `/clientes/[id]` inclui ações rápidas e gráfico corporal para Nutrição; para Personal mantém o resumo cadastral e `ProfessionalScopePanel` com aviso de migração. | Há uma lacuna de integração: a API de treinos já usa Client, mas o prontuário ainda apresenta o domínio como indisponível. |
| Avaliação física | `AssessmentModal` e `CreateAssessmentDto` têm medidas, perímetros, dobras e campos de desempenho específicos do Personal: supino/agachamento/terra 1RM e VO₂. | Existe uma base aproveitável. O modal exige peso mesmo para registrar somente desempenho, mistura “kg ou %” para massa muscular e mantém exemplo de observação sobre dieta. |
| Prescrição | Editor e API usam Client, divisões A/B/C, exercícios, séries, repetições, descanso, observações e duração em semanas. | Não partir do zero. Hoje os exercícios são digitados livremente; não há catálogo estruturado nesse fluxo. |
| Integridade do treino | `WorkoutsService.create` confere propriedade, trava o Client e substitui o treino ativo em transação. | Preservar essas garantias ao acrescentar rascunhos e versões. |
| Revisão/histórico | O editor carrega o treino ativo; salvar cria outro treino e desativa o anterior. A listagem abre o editor pelo Client, mesmo quando a linha selecionada representa um treino anterior. | Existem registros anteriores, mas não um fluxo completo de versões imutáveis ou consulta fiel da versão selecionada. |
| Modelos de treino | `saveAsTemplate` altera `isTemplate` no treino existente. O editor consultado não aplica modelos. | O modelo continua vinculado ao aluno. O fluxo de salvar, escolher, aplicar e personalizar está incompleto. |
| Documentos | “Exportar PDF” chama `window.print()` no editor. O botão de WhatsApp não tem ação implementada. | Impressão existe, mas falta documento dedicado gerado da prescrição salva e compartilhamento manual concreto. |
| Anamnese, metas e notas de consulta | Rotas atuais desses domínios são restritas a Nutrição. | A semântica e as permissões precisam de um desenho de treinamento; apenas liberar menus ou papéis não cria a funcionalidade adequada. |
| Resumo 360 e alertas | `ClientOverviewService` consulta vários domínios após validar Client. Os alertas do Personal dependem de `DailyTracking`; os módulos de tracking/logs do paciente não estão montados no `AppModule`. | Criar projeção específica de treinamento e indicadores operacionais com fontes reais. Ausência de tracking não comprova inatividade do aluno. |
| Agenda | Contrato existente suporta sessão, avaliação, retorno, presencial/online e estados de agendamento. | Reutilizar a agenda profissional antes de criar outro calendário. Agendamento concluído não equivale a registro detalhado de exercícios realizados. |

O backlog tem itens históricos que já não descrevem integralmente a implementação. Uma tarefa antiga marcada como pendente não foi usada como prova de que o recurso ainda inexiste.

## 4. Abordagem recomendada

**Evoluir por jornadas completas sobre a fundação existente.** Compartilhar autenticação, Client, agenda, componentes e isolamento; acrescentar contratos e telas próprios de treinamento. Cada entrega termina com uma ação útil e verificável para o Personal.

Outras abordagens consideradas:

| Abordagem | Vantagem | Limite |
|---|---|---|
| Ampliar somente menus e aparência | Entrega visual rápida. | Mantém modelos incompletos, acompanhamento ausente e ações sem integração. |
| Reconstruir todo o módulo | Permite reorganização ampla. | Descarta partes aproveitáveis e aumenta o risco de regressão e migração. |

O núcleo recomendado para a primeira jornada é **prontuário do aluno + avaliação + treino ativo**, ligado à agenda. Funcionalidades avançadas entram depois da prescrição e do histórico estarem consistentes.

## 5. Experiência proposta

### Visão geral do Personal

A tela organiza o trabalho: compromissos do dia, alunos sem treino ativo, avaliações registradas e acesso rápido ao prontuário. Exibir contagens apenas quando a consulta correspondente foi concluída; uma falha deve aparecer como indisponibilidade, sem se transformar em zero ou lista vazia.

Para a conta nova, mostrar uma sequência curta de ativação: cadastrar aluno, registrar a primeira avaliação e montar a primeira prescrição. Depois, a visão geral passa a priorizar o trabalho da base real.

Reavaliação atrasada, treino a revisar e vencimento exigem datas e regras explicitamente registradas. `durationWeeks` e `createdAt` não serão usados para inventar uma data de início ou de validade.

### Prontuário de treinamento

O cabeçalho mantém identificação, contato, objetivo e situação do aluno. O conteúdo é organizado por:

1. **Resumo:** contexto relevante, último atendimento e próxima ação disponível.
2. **Avaliações:** medidas e desempenho efetivamente registrados, com data e unidade.
3. **Treinos:** prescrição ativa, consulta dos registros anteriores e ações de criação/revisão com significado explícito.
4. **Acompanhamento:** sessões e observações registradas pelo Personal, quando essa etapa estiver implementada.
5. **Documentos:** prescrições finalizadas para impressão e entrega, quando o fluxo correspondente estiver disponível.

A anamnese de treinamento deve organizar experiência, disponibilidade, ambiente, equipamentos, preferências e limitações relatadas. Sua estrutura e persistência serão especificadas em uma entrega própria; o sistema não produzirá decisão automática de aptidão ou prescrição.

### Identidade e navegação

Preservar inicialmente o shell, os tokens atuais e a identidade do SafeMove. A diferenciação virá de conteúdo, ações, formulários e hierarquia próprios de treinamento. Usar “Aluno”, “Treino”, “Avaliação física”, “Sessão” e “Reavaliação” de forma consistente.

Navegação final proposta:

- **Atendimento:** Visão geral, Agenda, Alunos, Avaliações físicas.
- **Treinamento:** Treinos, Exercícios, Modelos de treino.
- **Acompanhamento:** Evolução e Reavaliações.

Novas entradas aparecem somente quando houver fluxo real. Periodização e relatórios entram nas etapas seguintes, sem reservar páginas vazias no primeiro lote.

## 6. Entregas em ordem

### P1 — Workspace e prontuário integrados (primeiro lote recomendado)

**Resultado:** o Personal abre um aluno, entende o contexto, vê sua avaliação e treino ativo e consegue iniciar uma prescrição ou avaliação pelas ações do prontuário.

- Criar composição de dashboard e ações rápidas para Personal, mantendo a base comum.
- Integrar agenda existente e dados reais de alunos/treinos.
- Mostrar avaliação mais recente e prescrição ativa no prontuário.
- Substituir o aviso genérico de migração do Personal por essas funcionalidades efetivamente disponíveis.
- Separar consulta da prescrição selecionada e criação de uma nova prescrição; a listagem deve respeitar o ID do treino escolhido.
- Remover exemplos de treino pré-preenchidos que possam ser confundidos com conteúdo prescrito ao aluno.
- Corrigir o texto nutricional e permitir avaliação de desempenho sem obrigar peso; explicitar unidades antes de usar medidas ambíguas em comparações.
- Usar uma projeção de dados de treinamento que não consulte dietas, exames ou reabilitação.
- Tratar carregamento, erro, vazio, sessão inválida e Client arquivado. Histórico continua consultável; arquivamento do aluno não cria ou remove treinos.

**Critérios:** navegação direta autorizada; nenhum dado de outra conta; nenhuma chamada a domínio nutricional/fisioterapêutico no novo fluxo; valores ausentes tratados como não registrados; erro de consulta distinto de ausência de dados; interface utilizável por teclado e em celular.

**Limite do lote:** aproveita persistência existente. Pode acrescentar endpoints de leitura e componentes, sem depender de novos campos de banco. Ainda não entrega rascunhos persistidos, modelos independentes, diário de sessão ou versionamento formal.

### P2 — Contexto de treinamento e avaliações completas

Dividir em duas entregas: estrutura da anamnese de treinamento; depois ampliação dos registros e comparações de avaliação.

- Registrar disponibilidade, experiência, ambiente/equipamentos e contexto informado pelo profissional.
- Associar avaliação a protocolo, data e unidades claras. Diferenciar resultados medidos e estimados quando houver estimativas implementadas e verificadas.
- Comparar somente medidas compatíveis; informação ausente não vira zero.
- Planejar a data da próxima reavaliação, sem presumir periodicidade universal.

**Critério:** o profissional registra e consulta o contexto, compara avaliações compatíveis e encontra a reavaliação planejada. Conteúdo nutricional não aparece nesse fluxo.

Novos campos/entidades exigem proposta de schema e migration revisada conforme `AGENTS.md`. Não usar `professionalNotes` como substituto oculto para um banco de dados estruturado.

### P3 — Editor profissional e biblioteca de exercícios

Entregar primeiro o catálogo e a seleção no editor; depois os parâmetros avançados.

- Biblioteca por nome, grupo muscular, padrão de movimento e equipamento, com exercícios próprios do profissional.
- Reordenar e duplicar exercícios/divisões com alternativa por teclado.
- Séries, faixas de repetições, carga prescrita, intervalo e orientações explícitas.
- Cadência, esforço percebido/repetições em reserva e agrupamentos como circuitos em incremento posterior, com campos opcionais adequados ao tipo de treino.
- Evitar cálculo de volume a partir de texto livre sem uma estrutura numérica e uma regra verificável.
- A prescrição preserva o conteúdo escolhido; editar o catálogo não modifica treinos já salvos.

**Critério:** construir uma prescrição personalizada com biblioteca e parâmetros sem redigitar tudo; exercícios e parâmetros mantêm sua ordem e seu conteúdo ao salvar/reabrir.

Vídeos, upload de mídia e um catálogo amplo curado ficam para outra entrega, com origem e direitos de uso definidos. A biblioteca inicial deve ser pequena e editável, sem alegar uma curadoria inexistente.

### P4 — Versões, modelos independentes e documentos

São três entregas encadeadas, com verificação ao final de cada uma:

1. **Versões:** rascunho persistido → finalização → ativo; revisão copia para novo rascunho; versão anterior substituída é preservada. Migrar os registros anteriores com semântica explícita, sem inventar estados históricos. Finalização concorrente mantém um plano principal ativo.
2. **Modelos:** biblioteca independente de alunos, pertencente ao Personal; aplicar modelo cria cópia profunda editável. Alterar/arquivar o modelo não altera prescrições existentes. A cópia não carrega identificação ou observações privadas do aluno original.
3. **Documentos:** impressão/PDF dedicado da versão salva e finalizada, com identificação profissional, aluno, data, versão, divisões e orientações destinadas ao aluno. Notas privadas são excluídas. Compartilhamento é manual, com comportamento explícito para download e envio.

**Critérios:** falha não substitui o plano anterior; rascunho sobrevive à recarga sem armazenamento clínico no navegador; versão finalizada mantém o conteúdo; o documento reproduz essa versão; aplicar modelo não cria vínculo de identidade com outro aluno.

O atual `isActive`/`isTemplate` não será anunciado como equivalente a essas garantias. O fluxo de exclusão de treinos precisa ser revisto para preservar prescrições finalizadas e histórico.

### P5 — Sessões, evolução e revisão periódica

- Registrar pelo Personal a sessão/contato de acompanhamento, o treino/versão utilizado e as observações relevantes.
- No presencial, registrar execução quando o profissional a acompanhou. Na consultoria online, identificar resultados relatados e registrados pelo profissional.
- Comparar prescrito e realizado apenas para exercícios e períodos com dados disponíveis.
- Mostrar evolução de medidas e desempenho com origem, datas e unidades; não inferir frequência real de treino a partir da agenda.
- Gerar lista de revisões e reavaliações pendentes a partir de datas planejadas.

**Critério:** reconstruir o que foi prescrito, registrado e alterado em um período, distinguindo ausência de registro, falta em compromisso e execução de treino.

### P6 — Periodização e gestão do acompanhamento

Depois do núcleo validado: planejamento por ciclos/semanas, objetivos de cada período, datas de revisão e relatórios do acompanhamento. Definir primeiro quais decisões o Personal precisa tomar; cada indicador deve ter fonte e cálculo documentados.

Gestão financeira, equipes, aplicativos de aluno, wearables e geração automática de treino não fazem parte deste primeiro ciclo de evolução.

## 7. Arquitetura e regras de dados

- Reutilizar `Client`, ownership, autenticação, agenda e infraestrutura TanStack Query.
- Manter componentes próprios para treinamento em `web/components/features/`, hooks em `web/hooks/features/` e módulos de domínio na API.
- Definir o contrato de leitura do Personal antes de alterar o dashboard/prontuário. Paginação/agregação evita uma chamada de overview por aluno para montar contagens da base.
- `professionalId` vem da identidade autenticada. Client precisa ser resolvido como pertencente ao profissional antes de ler ou escrever seus recursos.
- Exercício reutilizável e modelo têm proprietário; prescrição mantém snapshot do conteúdo aplicado. Registro de execução guarda referência à versão prescrita quando existir versionamento.
- Não ampliar indiscriminadamente permissões de anamnese, metas e notas nutricionais. Compartilhar apenas infraestrutura e conceitos cuja semântica for adequada.
- Conflitos de edição precisam preservar o trabalho e permitir recarga explícita; a forma de concorrência para cada nova entidade será definida na sua especificação.
- Não persistir rascunhos, avaliações ou conteúdo sensível em localStorage/sessionStorage.
- Não ativar indicadores de inatividade, platô ou excesso de treino a partir de tracking ausente. Primeiro definir registros profissionais e regras que os dados suportem.

Schema, migrations, CI, deploy e `PRODUCT.md` permanecem sujeitos às regras de revisão do repositório. Nenhum desses arquivos foi alterado neste diagnóstico.

## 8. Mapa inicial do primeiro lote

| Unidade | Base a consultar/alterar na execução | Responsabilidade |
|---|---|---|
| Navegação e limite de atuação | `web/lib/professional-workspace.ts`, componentes de shell e testes de papéis | Terminologia e rotas reais do Personal. |
| Dashboard | `ProfessionalDashboard`, `useProfessionalDashboard`, hooks da agenda; novos componentes/hooks de treinamento | Operação diária com fontes reais e estados independentes. |
| Prontuário | `web/app/clientes/[id]/page.tsx`, componentes específicos de treinamento | Resumo, avaliação, treino ativo e ações contextualizadas. |
| Avaliação | `AssessmentModal`, hooks de avaliações, DTO/serviço existentes | Registro compatível com a finalidade e sem conteúdo de Nutrição. |
| Consulta de treino | `treinos/page.tsx`, editor, `workouts.controller.ts`/`workouts.service.ts` | Abrir o treino correto e preservar a autorização. |
| Projeção de dados | Overview específico de treinamento ou seleção por atuação no serviço existente | Carregar somente os recursos necessários e autorizados. |
| Verificação | Testes de workout, Client, dashboard, fronteiras profissionais e Cypress real | Provar jornada e isolamento. |

A especificação P1 escolheu contratos específicos no módulo de treinos, preservando o overview comum. A main remota atual já contém o contexto transacional/RLS e a classificação de respostas clínicas; a implementação deve seguir esses mecanismos, sem sobrescrever suas correções. Não é necessário esperar uma reconstrução geral para integrar os recursos de treinamento existentes.

## 9. Validação para cada entrega de produto

- API: regras de proprietário/papel, IDs estrangeiros, arquivamento, validação e integridade transacional afetados.
- Frontend: ações e estados reais; acesso direto às rotas; cache separado por profissional; ausência de chamadas de outras atuações.
- E2E com banco sintético isolado: dois Personais e alunos distintos, além da regressão dos fluxos de Nutrição/Fisioterapia afetados por componentes compartilhados.
- Jornada real do Personal: cadastrar → avaliar → prescrever → reabrir. Acrescentar aplicar modelo, revisar versão e gerar documento somente nas fases correspondentes.
- Executar a jornada somente com credenciais do Personal; nenhum passo pode exigir acesso, preenchimento, confirmação ou login do aluno.
- Typecheck, lint sem alterações automáticas inesperadas, testes afetados e builds. No Windows, usar `npm.cmd`/`npx.cmd`. Os scripts foram consultados; esses checks ainda não foram executados neste planejamento.
- Inspeção visual de desktop/celular ao concluir o fluxo, seguindo a regra do repositório de evitar capturas repetidas.

## 10. Referências externas de fluxo

As referências servem apenas para comparar ergonomia de software. Não representam validação clínica nem autorização para reutilizar catálogo ou mídia.

- O TrueCoach documenta programas reutilizáveis e a atribuição a alunos, incluindo comportamento de edição e sincronização. Isso reforça a necessidade de distinguir biblioteca e prescrição individual. O SafeMove propõe cópias independentes e versões preservadas: [Programs](https://help.truecoach.co/en/articles/3047401-programs).
- O editor do TrueCoach documenta seleção de exercícios, parâmetros, superséries e circuitos. A proposta do SafeMove adota uma progressão de complexidade para manter a criação do treino rápida: [The Workout Builder Basics](https://help.truecoach.co/en/articles/3047972-the-workout-builder-basics).

## 11. Próxima decisão

A recomendação é especificar **P1 — workspace e prontuário do Personal** como a primeira implementação. Seu sucesso será permitir ao profissional abrir um aluno e iniciar/consultar avaliação e treino no mesmo fluxo, com dados reais e autorização por proprietário.

Depois da revisão desta proposta, escrever uma especificação focada de P1 com telas, contratos de leitura, estados e critérios de aceite; em seguida, produzir seu plano técnico de execução. As demais fases permanecem como roadmap proposto, sem execução automática ou compromisso de prazo.

Direção aprovada pelo usuário em 14/10/2026. Especificação escrita para revisão: [[docs/superpowers/specs/2026-10-14-personal-workspace-prontuario-p1-design|P1 — Painel de trabalho e prontuário do Personal]].
