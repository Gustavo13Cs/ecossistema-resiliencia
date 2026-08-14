# Design: Agenda Diária Integrada

**Data:** 13 de agosto de 2026

**Status:** Aprovado para planejamento

**Produto:** Ecossistema Resiliência / SafeMove

## 1. Contexto

O produto conecta pacientes a nutricionistas, personal trainers e fisioterapeutas. Os módulos clínicos já organizam planos e registros por especialidade, mas o paciente precisa de uma experiência diária única e os profissionais precisam acompanhar execução, saúde e compromissos sem perder autoria, privacidade ou histórico.

A solução será uma agenda centrada em tarefas, com agendamento completo, check-ins de saúde, notificações internas e por e-mail e compartilhamento controlado.

## 2. Objetivos

- Dar ao paciente uma tela única para entender o que fazer hoje.
- Permitir que profissionais criem tarefas manuais únicas ou recorrentes.
- Registrar conclusão, atraso, omissão e justificativa sem reescrever o histórico.
- Permitir reserva de horários disponíveis e solicitações especiais com contraproposta.
- Reunir registros de saúde feitos pelo paciente, sujeitos a consentimento.
- Notificar eventos importantes dentro da plataforma e por e-mail.
- Oferecer ao profissional uma visão de adesão, pendências e exceções relevantes.

## 3. Fora do escopo inicial

- Importar automaticamente tarefas de planos de dieta, treino ou reabilitação.
- Diagnóstico, prescrição ou decisão clínica automática.
- WhatsApp, SMS, push mobile, videochamada, pagamentos ou integração com calendários externos.
- Chat em tempo real entre paciente e profissional.
- Substituir os módulos clínicos ou o prontuário existente.

## 4. Decisões aprovadas

- A agenda será centrada em tarefas, não em eventos genéricos de calendário.
- As tarefas serão criadas manualmente pelo profissional.
- O paciente poderá executar tarefas e registrar saúde, mas não criar prescrições.
- O agendamento será híbrido: reserva de horário aberto ou solicitação especial.
- As notificações serão internas e por e-mail.
- O compartilhamento será controlado por vínculo, categoria e consentimento.
- Consultas aparecerão na agenda diária, mas terão fluxo e estados próprios.

## 5. Experiência do usuário

### 5.1 Paciente

A rota `/paciente/agenda` apresenta:

- data selecionada e progresso diário;
- próximo compromisso confirmado;
- tarefas em ordem cronológica;
- autor, instruções, horário, prioridade e estado de cada tarefa;
- ações para concluir, pular ou justificar;
- acesso ao check-in diário de saúde;
- acesso ao fluxo de agendamento e reagendamento.

O foco visual é a próxima ação. Módulos clínicos continuam disponíveis, mas não são necessários para executar a rotina diária.

### 5.2 Profissional

A rota `/membros/[id]/agenda` apresenta:

- agenda do paciente selecionado;
- criação, edição, pausa e encerramento de tarefas;
- percentual de adesão e pendências;
- registros de saúde autorizados;
- horários disponíveis e solicitações de consulta;
- alertas que exigem revisão;
- autoria e histórico das alterações.

### 5.3 Ciclo principal

1. O profissional cria uma tarefa ou disponibilidade.
2. A plataforma gera ocorrências e lembretes idempotentes.
3. O paciente executa a tarefa, registra saúde ou solicita uma consulta.
4. O sistema consolida estados e eventos.
5. O profissional acompanha adesão, responde solicitações e ajusta somente o futuro.

## 6. Arquitetura modular

### 6.1 Agenda

Responsável por definições de tarefas, recorrência, ocorrências diárias, estados e métricas de adesão.

### 6.2 Agendamentos

Responsável por disponibilidade, bloqueios, reserva direta, solicitação especial, contraproposta, confirmação, conclusão, ausência, cancelamento e reagendamento.

### 6.3 Check-ins de saúde

Responsável por hidratação, dor, humor, sintomas e observações registradas pelo paciente. Esses dados não produzem diagnóstico automático.

### 6.4 Consentimento e autorização

Serviço central que combina identidade, role, vínculo ativo, propriedade do recurso e consentimento da categoria solicitada.

### 6.5 Notificações

Responsável pela caixa de entrada interna e por uma outbox de e-mails com idempotência, tentativas e rastreabilidade.

Os módulos se comunicam por contratos explícitos e eventos de aplicação. Uma falha de e-mail não pode desfazer a operação principal.

## 7. Modelo de dados proposto

Os nomes abaixo são conceituais e devem ser preservados no plano de implementação, salvo incompatibilidade técnica comprovada.

### 7.1 `AgendaTask`

Define o planejamento criado pelo profissional:

- `id`, `patientId`, `professionalId`;
- `title`, `category`, `instructions`, `priority`;
- `startsAt`, `endsAt`, `timeZone`;
- `recurrenceRule` opcional;
- `status`: `ACTIVE`, `PAUSED` ou `ENDED`;
- `createdAt`, `updatedAt`.

Uma tarefa sem regra de recorrência é única. Para recorrência, a regra deve representar frequência diária, semanal ou dias personalizados sem depender do horário local do servidor.

### 7.2 `AgendaTaskOccurrence`

Representa cada execução esperada:

- `id`, `taskId`, `patientId`;
- `scheduledFor` em UTC;
- `status`: `PENDING`, `COMPLETED`, `SKIPPED`, `OVERDUE` ou `CANCELLED`;
- `completedAt`, `skipReason`, `patientNote` opcionais;
- `createdAt`, `updatedAt`.

Deve existir unicidade entre `taskId` e `scheduledFor`. Alterações na tarefa afetam apenas ocorrências futuras ainda não executadas. Ocorrências concluídas, puladas ou canceladas permanecem imutáveis quanto ao planejamento original, salvo correção auditada.

### 7.3 `HealthCheckIn`

- `id`, `patientId`;
- `recordedAt`;
- `waterMl` opcional;
- `painLevel` de 0 a 10 opcional;
- `mood` opcional;
- `symptoms` e `notes` opcionais;
- `createdAt`, `updatedAt`.

Validações devem aceitar registros parciais, mas rejeitar um check-in sem nenhum dado. Regras configuradas podem sinalizar atenção, sem emitir diagnóstico.

### 7.4 `PatientConsent`

- `id`, `patientId`, `professionalId`;
- `dataCategory`;
- `granted`;
- `grantedAt`, `revokedAt`, `updatedAt`;
- unicidade por paciente, profissional e categoria.

As categorias iniciais serão `GENERAL`, `NUTRITION`, `TRAINING`, `REHABILITATION` e `HEALTH_CHECK_IN`. Novas categorias exigem migration e atualização explícita das regras de acesso.

Dados operacionais necessários para cumprir uma tarefa criada pelo próprio profissional podem ser vistos por seu autor enquanto existir vínculo ativo. Check-ins sensíveis e dados fora da especialidade exigem consentimento explícito. Revogar consentimento bloqueia leituras futuras, mas não apaga auditoria.

### 7.5 Disponibilidade

`ProfessionalAvailabilityRule` descreve disponibilidade recorrente, duração padrão, fuso e intervalo de vigência. `ProfessionalAvailabilityException` representa bloqueios ou aberturas pontuais. `ProfessionalAvailabilitySlot` materializa horários reserváveis e deve ser único por profissional, início e fim.

### 7.6 `Appointment`

- `id`, `professionalId`, `patientId`;
- `startAt`, `endAt`, `timeZone`;
- `modality`: `IN_PERSON` ou `ONLINE`;
- `location` ou `meetingUrl` conforme modalidade;
- `status`: `REQUESTED`, `COUNTER_PROPOSED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` ou `NO_SHOW`;
- `requestedById`, `cancelledById`, `cancellationReason` opcionais;
- `createdAt`, `updatedAt`.

`AppointmentProposal` preserva cada horário proposto, autor, estado e resposta. Uma consulta confirmada pode referenciar um horário aberto ou ter nascido de uma solicitação especial.

### 7.7 Notificações e e-mail

`Notification` contém destinatário, tipo, conteúdo, recurso relacionado, `readAt` e uma chave de evento única.

`EmailDelivery` funciona como outbox persistente, contendo destinatário, template, payload, estado, número de tentativas, próxima tentativa, erro resumido e chave idempotente. O envio ocorre fora da transação da requisição, depois que o evento principal está confirmado.

O domínio dependerá de uma interface `EmailGateway`. A primeira implementação usará SMTP configurado por ambiente; testes usarão um adaptador falso. Isso evita acoplar regras de negócio a um fornecedor específico.

### 7.8 Compatibilidade com registros existentes

`DailyTracking`, logs de refeição e logs de treino não serão convertidos em agenda nem receberão duplo registro automático nesta entrega. A conclusão de tarefa manual pertence a `AgendaTaskOccurrence`. Dashboards podem consolidar fontes por uma camada de leitura, mantendo a origem explícita.

## 8. Autorização e privacidade

Toda operação clínica exige:

```text
autenticação válida
+ role autorizada
+ vínculo profissional-paciente ativo
+ propriedade ou autoria compatível
+ consentimento quando a categoria exigir
```

Regras mínimas:

- Paciente lê a própria agenda, altera apenas a execução de suas ocorrências e cria os próprios check-ins.
- Profissional cria e altera somente tarefas de pacientes com vínculo ativo.
- Um profissional não altera tarefas criadas por outro profissional.
- Profissional acessa check-ins somente nas categorias consentidas.
- Paciente controla concessão e revogação do consentimento.
- Administrador não recebe acesso clínico irrestrito apenas por possuir role administrativa.
- Recursos não autorizados devem retornar resposta que não revele sua existência.

## 9. Estados e regras

### 9.1 Tarefas

- `PENDING -> COMPLETED` pelo paciente.
- `PENDING -> SKIPPED` pelo paciente com justificativa conforme configuração.
- `PENDING -> OVERDUE` por processamento idempotente após o prazo.
- `PENDING/OVERDUE -> CANCELLED` quando uma alteração válida remove uma ocorrência futura.
- Estados finais não voltam a pendente sem uma correção explícita e auditada.

Pausar uma tarefa impede novas ocorrências, mas preserva o histórico. Encerrar uma tarefa cancela somente ocorrências futuras pendentes.

### 9.2 Agendamentos

- Reserva de horário livre pode ir diretamente para `CONFIRMED` quando permitido.
- Solicitação especial começa em `REQUESTED`.
- Uma contraproposta muda para `COUNTER_PROPOSED` e cria histórico.
- Aceitar proposta muda para `CONFIRMED`.
- Reagendar preserva o compromisso e adiciona nova proposta/histórico.
- Cancelar exige ator e motivo; o horário volta a ficar disponível quando aplicável.
- Consultas passadas confirmadas podem virar `COMPLETED` ou `NO_SHOW`.

Conflitos devem ser impedidos no banco e no serviço. A confirmação usa transação com isolamento adequado e verificação de sobreposição; apenas consultas em estados bloqueantes reservam horário.

## 10. APIs conceituais

### Agenda e check-in

- `POST /agenda/tasks`
- `PATCH /agenda/tasks/:id`
- `POST /agenda/tasks/:id/pause`
- `POST /agenda/tasks/:id/end`
- `GET /agenda/patient/:patientId?date=YYYY-MM-DD`
- `POST /agenda/occurrences/:id/complete`
- `POST /agenda/occurrences/:id/skip`
- `POST /health-check-ins`
- `GET /health-check-ins/patient/:patientId`

### Agendamentos

- `POST /appointments/availability-rules`
- `POST /appointments/availability-exceptions`
- `GET /appointments/availability/:professionalId`
- `POST /appointments`
- `POST /appointments/:id/proposals`
- `POST /appointments/:id/proposals/:proposalId/accept`
- `POST /appointments/:id/cancel`
- `POST /appointments/:id/complete`

### Consentimento e notificações

- `GET /consents/me`
- `PUT /consents/:professionalId/:category`
- `GET /notifications`
- `PATCH /notifications/:id/read`

DTOs validam formatos e limites; serviços continuam responsáveis por autorização, estado atual e propriedade.

## 11. Notificações

Eventos notificáveis:

- tarefa próxima, alterada ou atrasada;
- consulta solicitada;
- contraproposta recebida;
- consulta confirmada, reagendada ou cancelada;
- lembrete de consulta;
- check-in sinalizado para profissional autorizado.

O usuário pode configurar preferências de e-mail por categoria, exceto comunicações essenciais de segurança. Chaves idempotentes impedem notificações duplicadas. Falhas de e-mail usam retentativas com atraso progressivo e estado final de falha para suporte. A primeira versão atualiza a caixa interna por consulta periódica e ao navegar; WebSocket e push ficam fora do escopo.

## 12. Tratamento de erros

- `400` para payload ou data inválida.
- `401` para ausência de autenticação válida.
- `403` quando o usuário conhece o contexto da operação, mas sua role, vínculo ou consentimento não permite a ação.
- `404` em consultas diretas por identificador quando revelar a existência do recurso causaria vazamento de informação.
- `409` para conflito de horário, duplicidade idempotente ou transição de estado inválida.

Operações críticas usam transação. E-mail nunca faz parte da transação principal. Erros são registrados sem expor dados clínicos, tokens ou conteúdo sensível.

## 13. Concorrência, recorrência e tempo

- Datas persistidas em UTC; cada agenda guarda fuso IANA para conversão e recorrência.
- Geração de ocorrências usa uma janela futura limitada e renovada por processo agendado.
- A geração é reexecutável graças à unicidade `taskId + scheduledFor`.
- Mudança de fuso ou recorrência recalcula somente ocorrências futuras pendentes.
- Confirmação de consulta usa chave de idempotência e proteção contra sobreposição.
- Processadores de atraso, lembrete e e-mail podem repetir sem produzir efeitos duplicados.

## 14. Testes e critérios de aceite

### Unitários

- cálculo de recorrência e fuso;
- transições de tarefa e consulta;
- regras de consentimento e vínculo;
- cálculo de adesão;
- idempotência de notificações.

### Integração

- persistência e unicidade de ocorrências;
- edição preservando histórico;
- concorrência na reserva de horário;
- revogação de consentimento;
- outbox criada junto ao evento principal.

### Jornadas completas

1. Profissional cria tarefa recorrente; paciente conclui; adesão é atualizada.
2. Paciente pula tarefa com justificativa; profissional autor visualiza.
3. Paciente registra saúde; somente profissional autorizado visualiza.
4. Paciente reserva horário aberto sem dupla reserva.
5. Paciente solicita horário especial; profissional contrapropõe; paciente aceita.
6. Reagendamento atualiza agenda, histórico e notificações.
7. Profissional sem vínculo ou consentimento não acessa dados.
8. Falha de e-mail não perde tarefa, consulta nem notificação interna.

A entrega é aceita quando essas jornadas passam, builds de API e web passam sem ignorar erros de TypeScript, o schema é validado e as migrations reproduzem o banco a partir do repositório.

## 15. Ordem de entrega

1. Fundação de autorização, consentimento, modelos e migrations.
2. Tarefas, ocorrências, check-in e tela diária do paciente.
3. Planejamento e acompanhamento profissional.
4. Disponibilidade e agendamento híbrido.
5. Notificações internas e outbox de e-mail.
6. Métricas, alertas, testes de jornada e ajustes de acessibilidade.

Cada fase deve terminar com validação de schema, TypeScript, testes e uma jornada demonstrável antes de iniciar a seguinte.

Como o escopo é amplo, cada fase terá um plano executável próprio. A aprovação deste documento valida a arquitetura completa; a implementação começa pela fundação e avança somente após os critérios da fase corrente passarem.

## 16. Riscos e mitigação

- **Escopo grande:** entrega incremental preservando uma arquitetura única.
- **Vazamento de dados:** serviço central de acesso e testes negativos por role, vínculo e consentimento.
- **Recorrência incorreta:** UTC, fuso IANA, idempotência e testes em mudanças de horário.
- **Dupla reserva:** transação, detecção de sobreposição e restrição no banco.
- **E-mails duplicados:** outbox e chave idempotente.
- **Histórico perdido:** separar definição de tarefa, ocorrência e eventos de agendamento.
- **Duplicação com logs atuais:** manter fontes explícitas e consolidar apenas na leitura.

## 17. Resultado esperado

O paciente terá uma rotina diária simples e acionável. O profissional terá controle sobre planejamento e acompanhamento sem ultrapassar consentimentos. O sistema preservará histórico, autoria e consistência mesmo diante de recorrência, concorrência e falhas externas.
