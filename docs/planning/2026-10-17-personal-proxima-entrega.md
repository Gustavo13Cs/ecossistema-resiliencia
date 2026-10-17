# Personal — próxima entrega proposta

Data: 17/10/2026. Estado: direção de produto aprovada pelo usuário em conversa, incluindo a biblioteca visual. Especificações técnicas em revisão; implementação ainda não iniciada.
Base consultada: checkout `e33f9c7`, com workspace P1 e prescrição avançada integrados.

## Objetivo

Permitir que o Personal organize alunos, prescreva, acompanhe e revise o trabalho diário dentro do SafeMove. Esse é o objetivo da solicitação atual. O recorte proposto mantém o Personal como operador de todos os fluxos, seguindo o desenho existente do produto; não depende de acesso do aluno ao site.

## Diagnóstico atual

O menu da captura corresponde à navegação definida em `web/lib/professional-workspace.ts`, mas a quantidade de entradas não representa toda a funcionalidade existente.

| Recurso | Evidência no código | Próxima lacuna |
| --- | --- | --- |
| Painel e prontuário de treinamento | `TrainingReadService`, componentes de treinamento e hooks específicos | Ampliar pendências quando existirem datas e registros que as sustentem. |
| Prescrição avançada | Biblioteca, cargas, esforço, cadência, métodos, duplicação e ordem persistida | Salvar uma elaboração sem substituir o treino ativo. |
| Histórico e leitura | Ficha consultada pelo ID; criação desativa o treino anterior em transação | Formalizar rascunho, finalização, revisão e preservação de versões. |
| Modelos | `saveAsTemplate` marca o próprio treino com `isTemplate` | Biblioteca independente de aluno e aplicação por cópia. |
| Entrega de ficha | `WorkoutReadView` imprime o conteúdo salvo | Documento dedicado para entrega manual, após definir versões. |
| Acompanhamento | Agenda e avaliações já fornecem partes da rotina | Sessões registradas pelo Personal, evolução compatível e reavaliações planejadas. |

Essas conclusões vêm de leitura de código. Não foram verificados o deploy atual, dados reais, testes ou o comportamento no navegador nesta análise. O roadmap de 14/10 continua sendo contexto de produto; sua ordem e numeração não comprovam o estado atual das entregas.

## Caminhos possíveis

1. **Rascunhos e revisões primeiro — recomendado.** Completa o ciclo de prescrição e cria uma base confiável para modelos, documentos e acompanhamento. Exige contrato explícito de persistência e ciclo de vida.
2. **Acompanhamento primeiro.** Prioriza sessões, evolução e próximas reavaliações. Ajuda a organizar atendimentos, mas o trabalho de elaboração de treinos continua sem rascunho persistido.
3. **Modelos primeiro.** Reduz a digitação repetida. Exige separar modelo de prescrição e evitar transportar dados privados do aluno; não resolve a perda de elaboração não salva.

## Primeira entrega recomendada: rascunhos e revisões

### Jornada

Abrir aluno ativo → criar prescrição ou revisar uma ficha → salvar rascunho no servidor → sair e reabrir → finalizar explicitamente → consultar a nova ficha e a anterior.

### Comportamento proposto

- “Salvar rascunho” permite guardar uma elaboração incompleta; a finalização exige uma ficha válida.
- Guardar um rascunho não desativa a prescrição vigente.
- Revisar copia o conteúdo da ficha selecionada para um novo rascunho editável.
- Finalizar preserva o registro anterior e publica somente um treino principal ativo para o aluno.
- Fichas finalizadas têm conteúdo preservado; a exclusão física atual precisa ser revista para respeitar essa regra.
- Dois editores concorrentes não sobrescrevem trabalho silenciosamente. Um conflito mantém a elaboração em memória e oferece recarga explícita.
- Aluno arquivado mantém histórico legível, com escrita bloqueada também na API.
- Falhas de salvamento não apresentam sucesso e não substituem o treino vigente.
- A interface reutiliza o editor, o shell e os componentes atuais, com ações acessíveis no celular e por teclado.

### Direção técnica a detalhar na especificação

Reutilizar `WorkoutsModule`, Client, autenticação, contexto transacional e RLS. Definir estados de prescrição, identificação de revisão e controle de concorrência no servidor; revisar os contratos existentes antes de fechar schema e migration. Registros anteriores precisam manter uma semântica explícita de legado, sem inventar números ou datas históricas. Rascunhos clínicos não serão persistidos no armazenamento do navegador. Cache permanece separado por conta e aluno.

Mudanças em `api/prisma/schema.prisma` e `api/prisma/migrations/` precisam da revisão do mantenedor prevista em `AGENTS.md`, seção 8. O desenho exato dessas mudanças ainda precisa ser apresentado; esta proposta não autoriza aplicação de migration ou alteração em produção.

### Verificação de aceite prevista

Testar guardar e reabrir rascunho, finalizar, revisar e consultar o histórico. Cobrir isolamento entre dois Personais, aluno arquivado, gravações concorrentes e falha transacional que conserva o treino ativo. Validar a jornada com frontend, API e PostgreSQL sintético, além de tipos, lint e builds afetados. Não executar testes contra produção.

## Sequência posterior proposta

1. Modelos independentes: criar, buscar, arquivar e aplicar cópia editável sem identificação ou observações privadas do aluno de origem.
2. Documento de treino: reproduzir a ficha finalizada com identificação e orientações para o aluno, separado das notas privadas.
3. Contexto e acompanhamento: anamnese de treinamento, sessões observadas ou relatadas, evolução com datas/unidades compatíveis e próxima reavaliação planejada.
4. Organização do trabalho: reunir revisões e reavaliações por datas explicitamente registradas, sem inferir execução ou inatividade da agenda.

Cada item é uma entrega própria. Não acrescentar menus antes de existir o fluxo correspondente. Gestão financeira, integrações externas e geração automática de treino exigem uma decisão de escopo própria.

## Requisito adicional solicitado: biblioteca visual de exercícios

O usuário acrescentou à proposta uma biblioteca com vários exercícios prontos e foto ou vídeo de demonstração, mantendo a opção de o Personal digitar ou cadastrar seu próprio exercício, e aprovou essa direção em 17/10/2026. A fonte de mídia deve cumprir a validação de cobertura e licença prevista nesta proposta.

### Viabilidade verificada em 17/10/2026

- **[wger](https://github.com/wger-project/wger):** o projeto oficial oferece REST API e declara os dados de exercícios sob Creative Commons, conforme cada registro. Os modelos oficiais `ExerciseImage` e `ExerciseVideo` incluem informações de licença. É candidato para uma integração com imagens e vídeos, mas a cobertura do catálogo, as condições do serviço público e seus limites precisam de validação antes de escolher o fornecedor. A licença AGPL do software não deve ser confundida com a licença individual das mídias.
- **[Free Exercise DB](https://github.com/yuhonas/free-exercise-db):** o JSON público consultado contém 876 exercícios, com referências de imagens em 873 registros. O README anuncia dados de domínio público e o repositório declara Unlicense. É uma base importável, sem necessidade de API paga, com instruções em inglês e fotos; não foi identificado campo de vídeo nessa verificação. A origem e os direitos das imagens devem ser conferidos antes de redistribuí-las; a licença declarada do repositório não é prova independente da titularidade de cada fotografia. Não foram baixadas ou inspecionadas as imagens.
- **[ExerciseDB](https://github.com/ExerciseDB/exercisedb-api):** anuncia imagens e vídeos e remete a planos comerciais. O README oficial informa que os endpoints de demonstração não são recomendados para produção. Não foi confirmado plano gratuito adequado ao SafeMove; não tratá-lo como mídia gratuita ilimitada.

Foram consultados README, licença e arquivos públicos dos repositórios por HTTP, além do JSON do Free Exercise DB. Não foram testados endpoints públicos do wger/ExerciseDB nem confirmados preços ou cotas de seus planos.

### Experiência proposta

1. Biblioteca já preenchida com nomes em português, busca, grupo muscular e equipamento, aproveitando o catálogo SafeMove existente.
2. Ao abrir um exercício, mostrar demonstração disponível, instruções e a origem/créditos exigidos pela licença. Distinguir variantes, como supino com barra e com halteres, antes de associar mídia.
3. Adicionar o exercício à ficha com séries, repetições, carga e orientações definidas pelo Personal. A mídia não define esses parâmetros.
4. Manter criação manual sem obrigar foto ou vídeo. Permitir associar um link de vídeo compatível é uma opção para especificar; upload próprio tem escopo separado de armazenamento e validação.
5. Sem mídia ou com falha no provedor, mostrar um estado explícito e manter seleção e prescrição utilizáveis. Não exigir conexão com o fornecedor para cada busca no catálogo local.

A recomendação técnica é manter catálogo e identificação estáveis no SafeMove, com associação explícita à fonte externa. Guardar referência do exercício/mídia na prescrição exige ampliar o contrato atual: hoje o item prescrito guarda nome e parâmetros, sem ID da biblioteca ou referência de mídia. A integração deve preservar as escolhas da ficha salva e respeitar a licença para cópia/cache das mídias. A escolha final entre wger e uma base importada depende de cobertura e direitos verificados; não prometer vídeo em todos os exercícios.

## Aprovação e continuidade

O usuário aprovou a proposta em conversa em 17/10/2026: “eu aprovo a proposta”. A aprovação abrange a direção de produto, incluindo biblioteca visual e cadastro manual. A execução será dividida em entregas focadas, começando por rascunhos/revisões e seguida pela biblioteca visual; os demais módulos permanecem no roadmap.

Especificações escritas para revisão:

- [Rascunhos e revisões de treino](../superpowers/specs/2026-10-17-personal-rascunhos-revisoes-design.md).
- [Biblioteca visual de exercícios](../superpowers/specs/2026-10-17-personal-biblioteca-visual-design.md).

Esses documentos detalham novos contratos e alterações protegidas. Sua revisão antecede o plano técnico e a implementação. A aprovação da direção não representa uma aplicação de migration ou publicação em produção.
