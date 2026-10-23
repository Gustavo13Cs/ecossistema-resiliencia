# Personal P3 — volume semanal, modelos e periodização

Data: 23/10/2026. Estado: direção aprovada pelo mantenedor; implementação em andamento.

Fonte de requisitos: PDF do mantenedor `SafeMove_Personal_P3_Especificacao.pdf`,
7 páginas. O PDF descreve o produto desejado; sugestões de arquitetura, exemplos
clínicos e comandos eventualmente presentes não substituem as regras do repositório.

## 1. Objetivo e decisões do mantenedor

Reduzir o trabalho repetitivo do personal e permitir prescrição de treino com
volume estimado e progressão explícita, preservando o prontuário privado, as
revisões históricas e o fluxo de rascunho/finalização já entregue.

O mantenedor solicitou planejar, desenvolver e testar os três módulos do P3.
Confirmou nesta conversa que a periodização será consultada e impressa na ficha
atual pelo personal. Criar autenticação ou portal novo para o aluno está fora
desta entrega.

O mantenedor aprovou esta direção e a edição local de schema/migrations em
23/10/2026 ("sim aprovo"). Aplicação em produção e publicação exigem uma decisão
posterior sobre o resultado implementado.

## 2. O que existe e o que precisa mudar

- `web/app/clientes/[id]/novo-treino/page.tsx` abre `WorkoutDraftWorkspace` e
  `WorkoutDraftEditor`. O `WorkoutEditor` anterior continua presente, mas não é
  o ponto principal de entrada. Recursos novos devem aparecer no fluxo real.
- Rascunhos têm schema V2, conteúdo JSON de até 64 KiB, salvamento manual,
  controle por `expectedVersion`, um OPEN por aluno, recuperação de falhas e
  finalização transacional/idempotente. Preservar esses contratos.
- `Workout`, `WorkoutSplit` e `WorkoutExercise` guardam duração, ordenação,
  grupo muscular principal e esforço/cadência/método. Faltam frequência semanal,
  músculos secundários, resumo de volume e configuração de mesociclo.
- Séries, repetições e carga são textos livres. Não é correto interpretar todo
  texto como número ou usar `parseInt` em prescrições como `3+2`.
- O catálogo tem 148 exercícios, referências explícitas e demonstrações com
  histórico/revogação; não possui mapa de músculos secundários. `SHOULDERS`
  representa ombros de forma agregada, sem separar deltoides.
- Não há `WorkoutTemplate`. `Workout.isTemplate` é um campo legado, sem o banco
  privado/global e o fluxo do PDF. Nutrição fornece referência de experiência,
  mas seu fluxo não deve ser copiado para substituir o de rascunhos do Personal.
- A API opera com `safemove_clinical`, contexto transacional de identidade e RLS;
  não usa o JWT próprio como `auth.uid()`. Uma tabela nova precisa entrar nesse
  contexto e na classificação das respostas clínicas.

## 3. Abordagem proposta e alternativas

**Recomendada: evolução aditiva do fluxo existente.** Integrar os módulos no
rascunho e na ficha, acrescentar metadados opcionais aos treinos e uma tabela
própria de modelos. O importador cria um rascunho; somente a finalização normal
ativa uma prescrição. Reutiliza proteção de histórico, concorrência e bloqueio
de aluno arquivado. Permite entregar e verificar volume → modelos → periodização.

Alternativas consideradas:

1. Armazenar tudo somente no navegador. Daria uma demonstração rápida, mas
   perderia frequência/progressão ao reabrir, não criaria biblioteca privada e
   contrariaria a persistência de snapshots pedida no PDF.
2. Reutilizar `isTemplate` e clonar diretamente uma ficha ativa. Reduziria a
   quantidade de entidades, mas confundiria modelo global com prescrição de
   aluno e criaria outro caminho para ativar treino, contornando o rascunho.

O mantenedor aprovou a evolução aditiva antes da implementação.

## 4. Volume semanal

### 4.1 Entrada, fórmula e qualidade dos dados

Adicionar `weeklyFrequency` por divisão: inteiro de 1 a 7. Novas divisões
mostram explicitamente 1 vez/semana, editável. Registros legados sem frequência
ficam como não informados; não apresentar uma suposição como dado histórico.

Para séries positivas inteiras reconhecidas, calcular:

`volume do músculo = soma(séries × frequência da divisão × contribuição)`.

O músculo principal contribui 1. Cada exercício pode ter músculos secundários
com pesos 0, 0,5 ou 1, editáveis pelo personal. O padrão para secundário é 0,5.
Impedir duplicatas e impedir o principal entre os secundários. Catálogo pode
fornecer sugestões explícitas por ID de exercício; nunca inferir sinergistas
apenas do nome ou do grupo principal (supino e crucifixo não são equivalentes).
Exercício próprio/manual permite informar secundários no editor.

Manter `SHOULDERS` agregado nesta entrega; a interface diz "Ombros". Não prometer
contagem individual de deltoide anterior/lateral sem classificação disponível.
`FULL_BODY`, `CARDIO` e `MOBILITY` não recebem landmarks de hipertrofia.

Aceitar no cálculo apenas `sets` que represente inteiro de 1 a 100 após trim.
Valores vazios, intervalos, métodos descritos em texto, grupo ausente ou frequência
ausente geram cobertura parcial, com os exercícios/divisões excluídos identificados.
Não bloquear a ficha textual existente por isso. Não tratar cardio como volume
de um músculo específico. Não multiplicar automaticamente drop sets/clusters.
O painel informa volume prescrito estimado, não séries efetivamente realizadas.

### 4.2 Classificação proposta

O PDF sobrepõe 12 séries, deixa 7 e 21 sem faixa e chama 6 de MEV em um exemplo,
apesar da tabela chamar 4–6 de manutenção. Proposta contínua e explícita:

| Séries estimadas/semana | Rótulo | Apresentação |
| --- | --- | --- |
| 0 | Sem séries contabilizadas | Neutra; indicar se cobertura é parcial |
| maior que 0 e menor que 4 | Abaixo da referência de manutenção | Amarelo |
| 4 até menos de 8 | MV / manutenção | Amarelo |
| 8 até menos de 12 | MEV / moderado | Azul |
| 12 até 20, inclusive | MAV / referência adaptativa | Verde |
| maior que 20 e menor que 22 | Acima da referência adaptativa | Amarelo |
| 22 ou mais | MRV / atenção à recuperação | Vermelho |

São referências gerais de planejamento, não limites individuais de segurança
ou garantia de resultado. Não afirmar que uma contagem prevê lesão.

Propor alerta de equilíbrio para peitoral/costas e quadríceps/posteriores quando
um lado tiver pelo menos 12 séries e exceder duas vezes o outro. Um lado zero
também alerta, sem divisão por zero. Comparar volume direto para evitar que
sinergias escondam a relação. Se a cobertura for parcial, suspender o alerta
comparativo e indicar que faltam dados. O alerta sugere revisão, nunca bloqueia.

### 4.3 Interface e persistência

`useWeeklyVolumeSummary` será uma adaptação memoizada de cálculo puro, sem HTTP.
Painel recolhível no editor real e resumo legível na ficha, acessível por texto
além das cores, com totais diretos/sinérgicos e informações de cobertura.

Ao finalizar, o servidor calcula um snapshot a partir do conteúdo validado na
mesma transação do treino. Não confiar em totais enviados pelo navegador.
Persistir versão do algoritmo, totais por músculo, cobertura e parâmetros usados.
Sem writes a cada edição/tecla. O histórico lê o snapshot salvo; não reclassifica
fichas antigas silenciosamente quando as referências mudarem.

O PDF chama o passo de "100% frontend" e também exige persistência de resumo.
A prévia é só frontend; frequência, pesos e snapshot persistidos exigem banco.
Gráficos longitudinais novos não entram no P3: o snapshot prepara esses dados.

## 5. Banco de modelos

### 5.1 Conteúdo e isolamento

Nova entidade `WorkoutTemplate`: UUID, `professionalId` opcional (NULL = global),
título, descrição, objetivo enumerado no contrato, nível enumerado no contrato,
público-alvo opcional, duração estimada, versão de conteúdo, JSON de estrutura,
datas de criação/atualização e índice por proprietário.

O JSON usa a estrutura validada de treino sem IDs de aluno, profissional,
prescrição, divisão ou exercício prescrito. Contém frequência, prescrições de
exercícios e referências autorizadas à biblioteca, sem aceitar snapshot de mídia
forjado pelo cliente. Novos metadados P3 integram a versão do conteúdo.

Modelos são snapshots imutáveis; "Salvar como modelo" cria outro registro.
Editar/arquivar/excluir modelos não é requisito do PDF e fica fora do primeiro
escopo. Manter metadados suficientes para evolução futura sem endpoint implícito.

RLS separa SELECT de INSERT: leitura de globais + próprios; criação apenas com
proprietário da sessão. A identidade vem da sessão, nunca do corpo. O runtime
clínico não recebe UPDATE/DELETE nesta tabela, nem consegue criar/alterar globais.
Grants mínimos e negação da Data API seguem o padrão de `custom_exercises`.
Modelos globais entram por migration/seed de referência, com owner de manutenção.
Testar com LOGIN real sem BYPASSRLS; teste com owner não prova isolamento.

Conjunto inicial proposto: PPL 3x, PPL 6x, Upper/Lower 4x, Fullbody 3x,
adaptação para iniciantes, hipertrofia com foco em glúteos e condicionamento
funcional. Usar somente IDs existentes do catálogo e conteúdo conservador.
São bases editáveis propostas pelo produto, sem declarar curadoria especializada
que ainda não ocorreu. Não incluir cargas de um aluno em um modelo global.

### 5.2 Fluxo e endpoints

Na entrada "Nova elaboração de treino", acrescentar "Começar a partir de modelo".
Modal com origem (SafeMove/meus modelos), objetivo e nível, estados de busca/erro,
preview de divisões, frequência e todos os parâmetros dos exercícios.

Endpoints propostos no `WorkoutsModule`, antes de rotas `:id` genéricas:

- `GET /workouts/templates`: lista paginada, filtros por objetivo, nível e origem.
- `GET /workouts/templates/:id`: detalhe autorizado da estrutura completa.
- `POST /workouts/templates/from-workout/:workoutId`: cria modelo privado de
  uma ficha finalizada própria, com título/objetivo/nível explícitos.
- `POST /workouts/templates/:id/create-draft`: recebe `clientId`, resolve o
  modelo autorizado e cria rascunho pelo serviço existente.

Todas as rotas requerem sessão PERSONAL, guardas existentes e `no-store`.
Listagem/detalhe de modelo usam classificação `private-template`; criação de
rascunho mantém a classificação de recurso clínico e validação de ownership do Client.
Salvar a partir de ficha também deve validar o Client de origem:
retornar envelope `{ clientId, template }` classificado como `resource`, sem
persistir essa associação no modelo. A listagem futura nunca inclui esse envelope.
Registrar o delegate de template no PrismaService vinculado ao contexto atual.

"Salvar como modelo" fica na ficha finalizada. Por padrão não copiar cargas,
notas livres dos exercícios/divisões ou orientações gerais do aluno. O modal
explica e mostra o que será salvo; descrição do modelo é digitada pelo personal.
Não copiar nome/ID do aluno, vínculo clínico ou data de início de periodização.
Parâmetros estruturados, repetições, esforço, cadência, método e descanso seguem.
Usar somente fonte pertencente ao personal e bloquear nova derivação de
prontuário arquivado, com a mesma verificação/lock de Client das demais escritas.

Na importação, copiar profundamente a estrutura, gerar IDs locais novos no editor
e usar IDs novos nas linhas criadas na finalização. Referências do catálogo são
revalidadas; para exercícios próprios, verificar proprietário. Resolver a mídia
atual autorizada no servidor; não reutilizar mídia revogada do template.
Referência inexistente/inacessível gera conflito explicativo, sem importação
parcial silenciosa. Tentar novamente não duplica rascunhos: a unicidade de OPEN
permanece e conflito oferece continuar o rascunho encontrado.

Importação não substitui o treino ativo. Com rascunho OPEN, mostrar continuar
ou descartar pelo fluxo existente; não sobrescrever trabalho. Alterações de
modelo ou ficha de origem jamais alteram as cópias já finalizadas.

## 6. Periodização opcional

### 6.1 Configuração e compatibilidade

Treinos sem periodização continuam válidos com duração legada de 1–104 semanas.
Ao habilitar periodização, exigir duração de 4–12 semanas, data de início civil
(`YYYY-MM-DD`) e fuso IANA registrado. Proposta de padrão visível: America/Sao_Paulo,
editável. A configuração é opcional no rascunho e só precisa estar completa para
finalizar. Usar `durationWeeks` como única duração, sem outro total concorrente.

Guardar fases com intervalo de semanas, nome/tipo, meta RIR ou RPE e regra de
deload. Exigir cobertura completa de 1 até a duração, sem lacunas/sobreposições;
cada semana pertence a exatamente uma fase. Validar meta numérica simples ou
intervalo ordenado: RIR 0–10, RPE 1–10. Sem reescrever os esforços textuais de
fichas antigas. Não inventar uma conversão universal obrigatória entre as escalas.

Sugestão editável, nunca ativada sem ação do personal:

| Duração | Adaptação | Sobrecarga | Pico | Deload |
| --- | --- | --- | --- | --- |
| 4 semanas | 1 | 2 | 3 | 4 |
| 5 semanas | 1 | 2–3 | 4 | 5 |
| 6 semanas | 1–2 | 3–4 | 5 | 6 |
| 7 semanas | 1–2 | 3–4 | 5–6 | 7 |
| 8–12 semanas | 1–2 | 3 até duração menos 3 | penúltimas 2 antes do deload | última |

Metas sugeridas: adaptação RIR 3–4, sobrecarga RIR 2, pico RIR 0–1,
deload RIR 4–5. O personal pode ajustar tipo de escala, metas e fronteiras.

### 6.2 Progressão e projeção

Regra opcional: intervalo de 1–4 semanas, aumento de 1–2 repetições por ciclo,
redução de RIR ou aumento de RPE de 0–2 por ciclo. Permitir selecionar só
repetições ou só esforço. Aplicar ciclos completos: na semana 1 o deslocamento é
zero; depois `floor((semana - 1) / intervalo)`.

Precedência: usar a meta da fase como base de esforço quando existir; aplicar o
delta de esforço ao número de ciclos completos dentro da fase, reiniciando na
primeira semana dela. Sem meta na fase, usar esforço numérico do exercício e
ciclos desde o início do plano. Limitar RIR a 0–10 e RPE a 1–10. Explicar essa
regra no configurador e na prévia para não haver duas interpretações.

Progressão de repetições soma o delta acumulado desde o início aos dois extremos
de inteiros/intervalos reconhecidos (`8`, `6-8`, `6 a 8`). Prescrições de tempo,
AMRAP ou texto complexo ficam intactas e indicadas como não projetadas. Cargas
livres (`20 kg`, `%1RM`, peso corporal) ficam intactas: o PDF permite progressão
por repetições como alternativa à carga; automação de carga não entra aqui.

Na fase deload, suspender progressão: usar repetições base, a meta explícita da
fase e `max(1, round(séries base × 0,6))` quando séries forem numéricas. Exibir
redução aproximada de 40%, pois o arredondamento não produz sempre 40% exatos.
Texto complexo não é convertido; mostrar orientação para revisão manual.

A projeção é calculada no servidor a partir da configuração salva e da semana
solicitada. Não modificar a ficha base, não criar treinos a cada semana e não
alterar o treino ativo por cron. O cliente usa regra pura equivalente na prévia;
vetores de casos compartilhados verificam paridade entre os dois lados.

### 6.3 Ficha, datas e impressão

Na ficha atual, mostrar régua de semanas com fase, semana atual e deload explícito,
seleção de semana para consulta e parâmetros projetados junto dos valores base.
Acrescentar uma leitura opcional `week` inteira de 1 até a duração em
`GET /workouts/:id`; sem parâmetro, o servidor determina a semana no fuso salvo.
Não mudar a resposta legada quando o treino não tiver configuração.

Antes da data de início, mostrar "Não iniciado"; após o último dia, "Concluído",
sem apresentar semanas 0 ou 13 como atuais. Semana 1 vai do início civil até
início + 6 dias; virada em início + 7 dias. Comparar datas civis no fuso do plano,
sem assumir que todo dia tem exatamente 24h. Atualizar o marcador ao voltar à aba
e na próxima meia-noite local; não depender de recarregamento manual.

A impressão identifica plano, semana consultada, datas e orientação de deload,
sem controles interativos ou contagem animada. Sem configuração, manter a ficha
estática. No resumo, distinguir volume base salvo e volume projetado da semana
selecionada; deload não reescreve o snapshot histórico de volume base.

## 7. Rascunhos, versões e falhas

Introduzir conteúdo V3 para metadados P3. Leitores aceitam V1/V2 e normalizam
campos novos ausentes para desconhecido/nulo; nenhum backfill inventa frequência,
sinergistas ou datas. V3 persiste apenas após um salvamento novo. Servidor continua
sendo o único autor de snapshots de mídia e volume. Conteúdo final deve caber
em 64 KiB, incluindo novos metadados; erro 413 preserva o formulário em memória.

Atualizar juntos normalização/upgrade, DTOs, criação direta ainda suportada,
finalização de rascunho, cópia de ficha, duplicação de divisão/exercício e leitura
detalhada. Não atualizar apenas um componente visível e perder dados ao salvar.
O editor antigo recebe propagação dos novos campos onde necessário para não
descartá-los; não se torna um caminho alternativo de finalização de rascunhos.

Manter `expectedVersion`, comparação da ficha ativa, rebase, lock de Client e
idempotência de finalizar. Falhas transitórias conservam texto; negação de acesso
e troca de conta removem estado clínico e ignoram respostas tardias. Chaves de
cache incluem dono/Client/template/semana quando aplicável, sem localStorage.

## 8. Alterações de banco propostas para autorização

| Entidade | Alteração aditiva |
| --- | --- |
| `WorkoutSplit` | `weeklyFrequency Int?`; check NULL ou 1–7 |
| `WorkoutExercise` | `secondaryMuscles Json?` validado em DTO/normalização |
| `Workout` | `weeklyVolumeSnapshot Json?` e `periodization Json?` versionados |
| `WorkoutTemplate` | Nova tabela `workout_templates`, relação opcional com `User`, metadados, JSON, índice e RLS |
| `User` | Relação inversa de modelos privados |

Arquivos protegidos a editar após aprovação: `api/prisma/schema.prisma` e novas
entradas em `api/prisma/migrations/`. Não reescrever migrations existentes.
Não há necessidade prevista de editar `.env`, CI, Compose ou `PRODUCT.md`.
Migration aditiva cria tabela, constraints, políticas/grants, campos opcionais e
modelos globais determinísticos. Executar/reexecutar somente em PostgreSQL
sintético isolado durante o desenvolvimento. Conferir schema via Prisma, replay
desde banco vazio e atualização de banco com fixtures legadas. Publicação e
aplicação de migration em produção não fazem parte desta aprovação de direção.

## 9. Sequência de desenvolvimento e critérios de aceite

Após aprovar esta direção, detalhar o plano executável por arquivos/tarefas usando
`superpowers:writing-plans`. A sequência técnica proposta é:

1. **Contratos e fundação persistida:** fechar V3, DTOs e migration aditiva,
   verificar compatibilidade com fichas/rascunhos legados e RLS.
2. **Monitor de volume:** cálculo puro, sugestões de sinergia por ID, frequência,
   ajustes no editor, cobertura/alertas e snapshot calculado na finalização.
3. **Modelos:** globais/privados, isolamento, salvar da ficha, filtros/preview e
   importar como rascunho com cópia profunda.
4. **Periodização:** regras de fase/progressão/deload, validação no servidor,
   configurador no rascunho, projeção por semana e ficha/impressão.
5. **Verificação integrada:** jornadas reais, regressão e relatório com evidências.

| Requisito | Evidência de aceite |
| --- | --- |
| Volume reage sem I/O | Alterar séries/frequência/pesos muda painel sem request adicional |
| Volume não inventa dados | Texto não numérico e legado ausente produzem cobertura parcial |
| Histórico estável | Reabrir ficha preserva totais/versão salvos, inclusive após revisão |
| Modelos globais e privados | Conta A vê próprios + globais; B não lê/importa modelos de A |
| Cópia profunda | Importar, editar e finalizar não altera fonte; IDs persistidos são novos |
| Rascunho respeitado | Importação com OPEN retorna conflito recuperável, sem sobrescrita |
| Ciclo 4–12 semanas | Todas as durações produzem fases válidas e datas de fronteira corretas |
| Progressão transparente | Prévia e API produzem os mesmos alvos a partir da mesma base |
| Deload explícito | Semana de recuperação reduz séries reconhecidas e aparece na impressão |
| Regressão preservada | P1/P2, revisões, mídia/revogação, concorrência e conta trocada continuam válidos |

## 10. Plano de testes e limitações conhecidas

**Domínio e componentes:** tabelas de volume nas fronteiras 0/4/8/12/20/22,
frações, sinergia sem duplicação, séries inválidas e cobertura parcial; fases para
todas as durações 4–12; datas antes/início/fim e fuso/DST; progressão, clamp,
intervalos textuais e arredondamento de deload; formulários, preview, teclado,
erro/retry, troca de conta, restauração V1/V2/V3 e tamanho de payload.

**API e PostgreSQL real isolado:** schema/replay, defaults legados, rollback de
finalização, snapshot recalculado, fonte imutável, concorrência de imports e
finalização, Client arquivado, proprietário de exercício, corpo/semana inválidos,
RLS com dois profissionais e LOGIN clínico, globais não graváveis pelo runtime,
Data API negada e classificação/validação de Client nos endpoints novos.

**Cypress com API/banco reais:** editar volume → salvar rascunho → reabrir →
finalizar → ler/imprimir; salvar modelo → filtrar/visualizar → importar para
outro aluno → adaptar → finalizar; consultar semanas de adaptação/pico/deload;
conta B tenta acesso direto aos IDs de A; falha transitória não apaga edição.
Inspecionar desktop/mobile e impressão ao concluir a funcionalidade, conforme
AGENTS.md. Não produzir screenshots repetidas a cada etapa.

**Comandos de gates:** `npm test` na API; `npm run test:e2e` com banco sintético;
`npm test`, `npm run typecheck`, `npm run lint` e `npm run build` na web;
`npm run build` na API e Cypress real focado no P3 e nos fluxos Personal existentes.
API lint deve usar ESLint sem `--fix` para verificação, pois o script atual modifica
arquivos. Rodar testes focados durante cada etapa e gates amplos após integração.

Dependências, Prisma gerado, PostgreSQL e navegador precisam ser verificados no
ambiente desta conversa. Números de testes em status históricos não são evidência
de que a branch atual passou. Não declarar P3 implementado com testes de mocks
apenas nem apresentar checks indisponíveis/falhos como aprovados.

## 11. Fora do escopo e decisões deixadas à implementação

Fora: novo portal/login de aluno, cron que altera prescrições, automação de cargas,
gráficos longitudinais novos, edição/arquivamento de modelos, certificação clínica,
mudanças no módulo de Nutrição, push/merge/deploy e acesso a banco de produção.

Implementação pode decidir nomes internos de DTOs, extração de componentes,
organização de funções puras e detalhes de layout respeitando o design system.
Se dividir a migration em etapas aditivas melhorar a revisão/teste, pode fazê-lo
sem mudar este escopo. Alterações materiais de regras ou escopo voltam ao mantenedor.

## 12. Revisão da proposta e verificação da base

Revisão independente de planejamento em 23/10/2026, pelo subagente
`review_p3_design`, segundo `brainstorming/builder-check-prompt.md`: resultado
`nothing important left`. É uma revisão de lacunas de especificação, não aprovação
humana nem revisão da implementação ainda inexistente.

Verificação da base atual, antes de alterar produto:

```bash
cd web
npm test -- lib/workout-form.test.ts lib/workout-draft-form.test.ts \
  components/features/training/WorkoutDraftEditor.test.tsx \
  components/features/training/WorkoutReadView.test.tsx
```

Resultado: 4 arquivos, 61 testes aprovados, saída 0. Isso não testa funcionalidades
P3 ainda não desenvolvidas. `git diff --check` também passou para a documentação.
A API possui dependências, mas o cliente Prisma gerado não foi encontrado no
caminho padrão nesta inspeção; preparar/verificar geração ao iniciar a execução.
Não foram executados migration, banco remoto, deploy ou testes reais P3.

Decisão de execução (23/10/2026): a referência anterior a auditoria de leitura
foi corrigida para classificação/validação de ownership. Conforme
`docs/SECURITY.md:94`, o mantenedor removeu a trilha persistente de leituras em
08/10/2026; P3 preserva essa decisão e não recria tabelas ou logs de acessos.
