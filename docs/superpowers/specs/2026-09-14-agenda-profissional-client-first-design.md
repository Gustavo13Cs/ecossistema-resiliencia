# Design: Agenda Profissional Client-first

**Data:** 14 de setembro de 2026
**Status:** Aprovado pelo mantenedor para implementação
**Produto:** SafeMove
**Escopo:** primeira vertical operacional de agendamentos do profissional

## 1. Contexto

A rota `/agenda` está integrada ao workspace profissional, mas ainda apresenta uma tela de planejamento. O repositório também contém um núcleo anterior de `AgendaTask`, criado para um paciente autenticável executar tarefas e check-ins. Esse fluxo usa `User.patientId`, `ProfessionalPatientLink` e rotas legadas de paciente.

O produto atual é profissional-first: cada conta administra prontuários privados `Client`, sem login ou portal do cliente. A Agenda Profissional não pode consumir o núcleo legado como se `User` e `Client` fossem a mesma entidade. Esta fase cria um domínio separado de atendimentos vinculados a `Client` e preserva o legado até a remoção coordenada das demais rotas antigas.

## 2. Objetivo

Entregar uma agenda operacional em que Nutricionistas, Personal Trainers e Fisioterapeutas possam:

- visualizar atendimentos por dia, semana e mês;
- criar e editar um atendimento para um prontuário ativo da própria conta;
- registrar confirmação, conclusão, falta ou cancelamento;
- impedir sobreposição de horários do mesmo profissional;
- abrir o prontuário relacionado sem perder o contexto;
- consultar histórico de alterações sem apagar registros operacionais.

## 3. Decisões aprovadas

- O recurso principal desta fase é `Appointment`, não `AgendaTask`.
- Todo atendimento pertence simultaneamente a `professionalId` e `clientId`.
- `Client` continua sem login; confirmação significa que o profissional registrou uma confirmação recebida fora da plataforma.
- A agenda é comum às três atuações profissionais, com a terminologia de cliente definida pelo workspace.
- Datas são persistidas em UTC e acompanhadas de fuso IANA.
- A interface usa somente dados reais da API e estados honestos de carregamento, vazio, erro e conflito.
- Não haverá exclusão física de atendimento pela interface.
- Reagendamento e transições de estado geram eventos de auditoria.
- O mantenedor aprovou em 14 de setembro de 2026 as alterações necessárias em `api/prisma/schema.prisma` e em uma nova migration versionada.

## 4. Fora do escopo desta fase

- Portal, login ou autosserviço do cliente.
- Reserva pública de horários e solicitação especial pelo cliente.
- Regras de disponibilidade recorrente.
- Atendimentos recorrentes.
- Lembretes automáticos, e-mail, SMS ou WhatsApp.
- Integração com Google Calendar ou outros calendários externos.
- Cobrança, pagamento, videochamada ou geração automática de link de reunião.
- Migração ou remoção do núcleo legado `AgendaTask`.
- Tarefas clínicas, check-ins e métricas de adesão preenchidas pelo cliente.
- Arrastar e soltar atendimentos no calendário.

Esses itens poderão evoluir sobre `Appointment`, mas não devem ampliar o primeiro plano executável.

## 5. Experiência da Agenda

### 5.1 Estrutura principal

A rota `/agenda` opera dentro do shell profissional existente e substitui integralmente o placeholder atual.

O primeiro viewport contém:

1. título `Agenda` e descrição curta da rotina;
2. ação primária `Novo atendimento`;
3. navegação temporal com `Hoje`, período anterior, próximo período e seletor de data;
4. seletor segmentado `Dia`, `Semana` e `Mês`;
5. filtros por prontuário e estado;
6. calendário como superfície dominante.

Não serão exibidos números demonstrativos. Contagens, quando presentes, serão derivadas da resposta carregada para o período atual.

### 5.2 Visão diária

- Linha do tempo vertical com horários e duração proporcional.
- Atendimentos em ordem cronológica.
- Intervalos livres permanecem visualmente discretos.
- O horário atual é indicado apenas quando o dia selecionado for hoje.
- Em telas pequenas, a linha do tempo vira uma lista cronológica legível.

### 5.3 Visão semanal

- Sete colunas em desktop, com o dia atual identificado por texto e contraste.
- Navegação completa por teclado entre controles; os cards continuam links ou botões semânticos.
- Em larguras menores, os dias são selecionados por uma faixa horizontal e o conteúdo do dia aparece como lista, sem tabela comprimida.

### 5.4 Visão mensal

- Grade mensal com seis semanas quando necessário.
- Cada célula mostra os primeiros atendimentos em ordem e um controle `+N` para o restante.
- Selecionar um dia abre a visão diária correspondente.
- A visualização cobre até 42 dias, incluindo dias adjacentes necessários à grade.

### 5.5 Detalhes e edição

Selecionar um atendimento abre um painel de detalhes com:

- horário e duração;
- prontuário vinculado;
- tipo, modalidade, local ou link;
- estado atual;
- observação operacional;
- ações permitidas naquele estado;
- acesso ao prontuário;
- histórico cronológico de eventos.

Criação e edição usam um diálogo acessível. Alterações de estado destrutivas, como cancelamento, exigem confirmação e motivo.

## 6. Modelo de domínio

### 6.1 `Appointment`

Campos:

- `id: String` UUID;
- `professionalId: String`;
- `clientId: String`;
- `kind: AppointmentKind`;
- `status: AppointmentStatus`;
- `modality: AppointmentModality`;
- `startsAt: DateTime` em UTC;
- `endsAt: DateTime` em UTC;
- `timeZone: String` IANA;
- `location: String?`;
- `meetingUrl: String?`;
- `notes: String?` com conteúdo operacional e limite de 1.000 caracteres;
- `cancellationReason: String?`;
- `cancelledAt: DateTime?`;
- `createdAt: DateTime`;
- `updatedAt: DateTime`.

Relações usam `onDelete: Restrict` para preservar histórico. Índices cobrem:

- `professionalId, startsAt`;
- `professionalId, status, startsAt`;
- `clientId, startsAt`.

### 6.2 Enums

`AppointmentKind`:

- `FIRST_VISIT` — atendimento inicial;
- `FOLLOW_UP` — retorno ou acompanhamento;
- `ASSESSMENT` — avaliação;
- `SESSION` — sessão clínica ou de treinamento;
- `OTHER` — outro atendimento descrito pelo profissional.

`AppointmentStatus`:

- `SCHEDULED`;
- `CONFIRMED`;
- `COMPLETED`;
- `CANCELLED`;
- `NO_SHOW`.

`AppointmentModality`:

- `IN_PERSON`;
- `ONLINE`.

### 6.3 `AppointmentEvent`

Preserva as mudanças relevantes sem armazenar payload clínico genérico:

- `id`, `appointmentId`, `professionalId`;
- `type: AppointmentEventType`;
- `previousStatus`, `nextStatus` opcionais;
- `previousStartsAt`, `previousEndsAt` opcionais;
- `nextStartsAt`, `nextEndsAt` opcionais;
- `createdAt`.

Eventos possíveis: `CREATED`, `UPDATED`, `RESCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` e `NO_SHOW`.

## 7. Regras de negócio

### 7.1 Propriedade

- Toda consulta filtra `professionalId` com o identificador da sessão.
- O `clientId` enviado deve pertencer ao mesmo profissional.
- Novo atendimento só pode usar `Client` com estado `ACTIVE`.
- Um profissional nunca lê, altera ou infere a existência de atendimento de outra conta.
- `ADMIN` não recebe acesso à agenda clínica.
- O frontend não substitui as verificações da API.

### 7.2 Horários

- `endsAt` deve ser posterior a `startsAt`.
- A duração mínima é 15 minutos e a máxima é 8 horas.
- Novos atendimentos devem começar no futuro.
- O intervalo é tratado como `[startsAt, endsAt)`, permitindo que um atendimento comece exatamente quando outro termina.
- `SCHEDULED` e `CONFIRMED` bloqueiam horário.
- `CANCELLED`, `COMPLETED` e `NO_SHOW` não bloqueiam novas reservas.
- Conflito de horário retorna `409` com mensagem operacional segura.

Criação e reagendamento executam a consulta de sobreposição e a escrita em transação `Serializable`. Conflitos de serialização do Prisma são convertidos em `409`; a operação nunca confirma silenciosamente dois atendimentos sobrepostos.

### 7.3 Modalidade

- `IN_PERSON` aceita `location` e limpa `meetingUrl`.
- `ONLINE` aceita `meetingUrl` HTTPS e limpa `location`.
- O formulário explica quando a informação ainda está ausente, sem fabricar endereço ou link.

### 7.4 Estados

- `SCHEDULED -> CONFIRMED | COMPLETED | CANCELLED | NO_SHOW`.
- `CONFIRMED -> COMPLETED | CANCELLED | NO_SHOW`.
- `COMPLETED`, `CANCELLED` e `NO_SHOW` são finais.
- `COMPLETED` e `NO_SHOW` só podem ser registrados depois do horário inicial.
- Reagendar `SCHEDULED` mantém `SCHEDULED`.
- Reagendar `CONFIRMED` volta para `SCHEDULED`, pois o novo horário exige nova confirmação.
- Cancelamento exige motivo entre 3 e 500 caracteres.

### 7.5 Concorrência de edição

Atualizações recebem `expectedUpdatedAt`. Se o registro mudou desde a abertura do formulário, a API retorna `409` e a interface oferece recarregar os dados antes de reaplicar qualquer mudança.

### 7.6 Prontuários arquivados

- Atendimentos históricos continuam visíveis com indicação de prontuário arquivado.
- Não é permitido criar ou reagendar atendimento para prontuário arquivado.
- Atendimentos futuros já existentes não são cancelados automaticamente no arquivamento; permanecem visíveis para decisão explícita do profissional.

## 8. API

Todos os endpoints usam `JwtAuthGuard`, `RolesGuard` e roles `NUTRITIONIST`, `PERSONAL` e `PHYSIO`.

- `GET /appointments?from=<ISO>&to=<ISO>&clientId=<UUID?>&status=<status?>`
- `GET /appointments/:id`
- `POST /appointments`
- `PATCH /appointments/:id`
- `POST /appointments/:id/confirm`
- `POST /appointments/:id/complete`
- `POST /appointments/:id/no-show`
- `POST /appointments/:id/cancel`

O intervalo de listagem deve ser válido, consciente de fuso e ter no máximo 42 dias. A resposta inclui somente os campos necessários de `Client`: `id`, `name` e `status`.

Códigos esperados:

- `400` para payload, duração, fuso ou transição temporal inválida;
- `401` para sessão ausente;
- `403` para role não profissional;
- `404` quando o recurso não pertence à conta ou não existe;
- `409` para sobreposição, edição concorrente ou transição inválida.

## 9. Frontend

### 9.1 Organização

- `web/types/appointment.ts` contém os contratos da agenda profissional.
- `web/hooks/features/useAppointments.ts` concentra leitura, mutações e invalidação de cache.
- `web/components/features/appointments/` contém toolbar, visualizações, cards, diálogo, detalhes e histórico.
- `web/app/agenda/page.tsx` coordena o período, filtros e estado da visualização, sem concentrar detalhes de apresentação.
- `web/lib/query-keys.ts` inclui a sessão, o intervalo e os filtros na chave.

O núcleo legado em `web/components/features/agenda/` continua isolado e não será importado pela nova rota.

### 9.2 Dados e erros

- TanStack Query mantém dados do servidor; não existe cache persistente de dados clínicos.
- Troca de período cancela a leitura anterior pelo `AbortSignal`.
- Falha de rede não é convertida em lista vazia.
- Mensagens da API só são exibidas quando forem strings curtas e seguras; o restante usa fallback local.
- Após mutação, são invalidadas somente as chaves da agenda e do prontuário afetado.
- Datas são formatadas em `pt-BR` no fuso do atendimento.

## 10. Direção visual e acessibilidade

O modo da superfície é `Operate`. A Agenda herda os tokens, tipografia, raios, sombras e shell já usados pelo workspace profissional.

- O calendário é a superfície dominante; não será colocado dentro de múltiplos cards decorativos.
- Verde da marca identifica ação e seleção, não o estado inteiro do atendimento.
- Estados usam texto, ícone e contraste, nunca somente cor.
- Controles têm alvo mínimo de 44 px e foco visível.
- Diálogo, painel e filtros são operáveis por teclado e anunciados por leitor de tela.
- O dia atual e o dia selecionado possuem rótulos acessíveis distintos.
- A grade mensal mantém cabeçalhos semânticos e alternativa em lista no celular.
- `prefers-reduced-motion` é respeitado; não há animação essencial.
- O alvo é WCAG 2.2 AA.

## 11. Testes

### 11.1 API unitária

- validação de propriedade do `Client`;
- criação e edição sem sobreposição;
- conflito de intervalos concorrentes;
- intervalos adjacentes permitidos;
- matriz completa de transições;
- restrições temporais de conclusão e falta;
- edição otimista com `expectedUpdatedAt`;
- prontuário arquivado;
- filtro obrigatório por `professionalId`;
- criação correta de `AppointmentEvent`.

### 11.2 API e2e

- profissional cria, lista, confirma, reagenda e conclui atendimento;
- segundo profissional recebe `404` ao tentar ler ou alterar o registro;
- `ADMIN` recebe `403`;
- conflito de horário retorna `409`;
- listagem de 42 dias funciona e intervalo maior retorna `400`;
- nenhuma resposta expõe campos privados desnecessários do prontuário.

### 11.3 Frontend unitário

- cálculo dos intervalos diário, semanal e mensal;
- ordenação e agrupamento por dia;
- exibição de estados e ações permitidas;
- formulário, validações e conflito concorrente;
- estados loading, empty, error e ready;
- terminologia das três atuações.

### 11.4 Cypress real

Contra Next.js, API e PostgreSQL de teste, sem mockar os endpoints principais:

1. profissional abre uma agenda vazia;
2. cria atendimento para seu prontuário ativo;
3. navega entre dia, semana e mês e encontra o mesmo registro;
4. confirma e reagenda o atendimento;
5. acessa o prontuário pelo painel de detalhes;
6. outro profissional não vê o atendimento;
7. layout permanece utilizável em desktop e celular.

## 12. Compatibilidade e rollout

- A migration é aditiva: cria enums, `appointments` e `appointment_events`.
- Nenhuma tabela ou coluna legada é removida.
- `AgendaTask`, ocorrências, check-ins e consentimentos antigos permanecem compilando até a etapa de remoção de fluxos de paciente.
- A nova rota profissional usa exclusivamente `/appointments`.
- Se a migration ainda não estiver aplicada, o deploy deve falhar de forma visível; a UI não substitui falha de infraestrutura por agenda vazia.
- O seed E2E cria dados próprios e os remove de forma determinística.

## 13. Critérios de aceite

A fase é concluída quando:

- a especificação e o plano foram revisados;
- Prisma validate e generate passam;
- typecheck, lint, testes e builds de API e web passam sem supressão;
- a migration reproduz o modelo em PostgreSQL de teste;
- o Cypress real comprova criação, navegação, transição e isolamento;
- o calendário funciona em desktop e celular;
- a inspeção visual final e o detector Impeccable não apresentam defeitos materiais;
- `docs/TASKS.md` e `docs/agents/CODEX_STATUS.md` refletem o resultado real.

## 14. Ordem de implementação

1. domínio, migration e API de `Appointment`;
2. contratos, hook e testes do frontend;
3. diálogo de criação e edição;
4. visualizações diária, semanal e mensal;
5. painel de detalhes, transições e acesso ao prontuário;
6. Cypress real, acessibilidade, inspeção visual e documentação final.

Cada etapa deve seguir Red, Green e Refactor. Nenhuma etapa posterior compensa falhas de autorização, concorrência ou persistência da anterior.
