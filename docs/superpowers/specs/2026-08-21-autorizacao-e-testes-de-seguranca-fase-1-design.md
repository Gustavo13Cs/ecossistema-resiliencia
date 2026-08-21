# Design: Autorização e Testes de Segurança — Fase 1

**Data:** 21 de agosto de 2026

**Status:** Aprovado em conversa; aguardando revisão da especificação escrita

**Produto:** Ecossistema Resiliência / SafeMove

## 1. Contexto

A API já possui autenticação JWT e um `PatientAccessService` que valida paciente autenticado e vínculo profissional-paciente. O uso dessas proteções, porém, ainda não é uniforme. O módulo `/metrics` é o primeiro alvo porque suas rotas não exigem autenticação e a criação de check-in aceita um `patientId` fornecido pelo cliente.

Esta fase estabelece um padrão reutilizável de autorização e o comprova em um fluxo completo antes de migrar os demais módulos clínicos. A implementação será incremental para reduzir risco de regressões e preservar os contratos usados pelo frontend sempre que isso não mantiver uma vulnerabilidade.

## 2. Política de autorização aprovada

### 2.1 Paciente

- Pode ler somente os próprios dados.
- Pode criar registros pessoais somente em seu próprio nome.
- O identificador do paciente em operações pessoais deve ser derivado do JWT quando possível, e não aceito como autoridade a partir do body.

### 2.2 Profissional clínico

Os papéis clínicos são `NUTRITIONIST`, `PERSONAL` e `PHYSIO`.

- Qualquer profissional clínico pode ler dados de um paciente quando existe um `ProfessionalPatientLink` ativo entre ambos.
- A leitura geral não concede permissão geral de escrita.
- Criação, alteração e exclusão permanecem restritas à especialidade responsável e, quando o recurso possuir autoria ou propriedade, ao autor ou proprietário autorizado.
- A ausência ou inativação do vínculo revoga o acesso.

### 2.3 Consentimento

- Dados sensíveis exigem vínculo ativo e consentimento válido do paciente para o profissional.
- São sensíveis, no mínimo: sintomas, dor, humor, anamnese, exames e outros dados clínicos equivalentes.
- Dados operacionais, como agenda, execução de tarefas e `DailyTracking`, exigem vínculo ativo, mas não consentimento adicional nesta fase.
- O acesso do próprio paciente aos próprios dados não depende de consentimento concedido a terceiros.

### 2.4 Administrador

- `ADMIN` gerencia contas, papéis, vínculos e aspectos operacionais.
- `ADMIN` não recebe acesso a prontuários ou dados clínicos por padrão.
- Um eventual acesso excepcional de suporte deverá ser projetado separadamente, com justificativa, duração limitada e auditoria; ele não faz parte desta fase.

## 3. Abordagem escolhida

O `PatientAccessService` existente será evoluído como ponto central das decisões de acesso a pacientes. Controllers continuarão responsáveis pela barreira HTTP — autenticação, papéis e validação do payload — enquanto services aplicarão as regras de autorização antes de consultar ou modificar dados.

Essa defesa em camadas evita que uma chamada interna ao service contorne uma regra presente apenas no controller. Não será adicionada nesta fase uma biblioteca externa de políticas como CASL, nem serão copiadas regras de vínculo para cada controller.

## 4. Escopo funcional da Fase 1

A primeira entrega protege o módulo `metrics`:

- `POST /metrics/checkin`;
- `GET /metrics/consistency/:patientId`;
- `GET /metrics/today/:patientId`.

As rotas de consulta serão preservadas para evitar uma quebra desnecessária no frontend. A autorização do `patientId` da URL será obrigatória.

### 4.1 Criação de check-in

- Exige JWT válido.
- Aceita somente paciente autenticado.
- O `patientId` gravado será `request.user.sub`.
- O DTO aceitará apenas os campos funcionais necessários, inicialmente `type` e `itemName`.
- Um `patientId` enviado no body será rejeitado pelo `ValidationPipe` como campo não permitido.
- Profissionais clínicos e `ADMIN` não poderão criar esse registro em nome do paciente.

### 4.2 Consultas de métricas

- Exigem JWT válido.
- Paciente pode consultar somente o próprio `patientId`.
- Profissional clínico pode consultar um paciente com vínculo ativo.
- Profissional sem vínculo ativo recebe acesso negado.
- `ADMIN` recebe acesso negado.
- `DailyTracking` é classificado como dado operacional nesta fase e não exige consentimento adicional.

## 5. Componentes e responsabilidades

### 5.1 `MetricsController`

- Aplica `JwtAuthGuard` e a restrição de papéis compatível com cada rota.
- Obtém o `AuthUser` a partir de `request.user`.
- Recebe DTOs validados e parâmetros de rota.
- Não consulta vínculo nem Prisma diretamente.

### 5.2 `PatientAccessService`

- Reconhece paciente acessando a si próprio.
- Reconhece profissional clínico com vínculo ativo.
- Rejeita papéis não clínicos, incluindo `ADMIN`, no acesso clínico.
- Fornece uma operação de leitura que encapsula a escolha entre acesso próprio e vínculo profissional.
- Mantém separadas as verificações de leitura, autoria e escrita para que vínculo geral de leitura não se transforme em escrita geral.

### 5.3 `MetricsService`

- Recebe o `AuthUser` em operações protegidas.
- Autoriza antes de chamar o Prisma.
- Deriva do usuário autenticado o paciente usado na criação.
- Preserva os cálculos e formatos atuais de consistência e histórico, salvo ajuste necessário para tipagem ou validação segura.

### 5.4 `MetricsModule`

- Importa o módulo de acesso a pacientes para usar o serviço central.
- Não adiciona nova dependência externa.

## 6. Fluxos de dados

### 6.1 Escrita

1. A requisição chega com JWT e body contendo `type` e `itemName`.
2. O guard autentica o JWT e disponibiliza `request.user`.
3. O DTO e o `ValidationPipe` rejeitam campos inesperados, inclusive `patientId`.
4. O service confirma que o usuário é paciente e usa `user.sub` como `patientId`.
5. Somente depois da autorização o Prisma cria o `DailyTracking`.

### 6.2 Leitura pelo paciente

1. O guard autentica a requisição.
2. O service compara `user.sub` com o `patientId` solicitado.
3. Em caso de igualdade, a consulta é executada; caso contrário, ela é negada antes do Prisma.

### 6.3 Leitura pelo profissional

1. O guard autentica a requisição e aceita somente papel clínico compatível.
2. O serviço central procura vínculo ativo entre `user.sub` e o paciente solicitado.
3. A consulta é executada somente quando o vínculo existe e está ativo.

## 7. Respostas de erro

- `401 Unauthorized`: JWT ausente, inválido ou expirado.
- `403 Forbidden`: usuário autenticado sem permissão, incluindo paciente acessando outro paciente, profissional sem vínculo, profissional tentando escrever em nome do paciente ou `ADMIN` acessando métricas clínicas.
- `400 Bad Request`: DTO inválido, campos obrigatórios inválidos ou campos não permitidos como `patientId` no body.
- Uma negação de autorização não deve causar consulta ou gravação no Prisma.
- Mensagens de erro não devem expor a existência de registros clínicos além do necessário.

## 8. Estratégia de testes

O desenvolvimento seguirá RED, GREEN e refatoração. Nenhum código de produção da fase será escrito antes do teste correspondente falhar pelo motivo esperado.

### 8.1 Testes unitários

Os testes do `PatientAccessService` e do `MetricsService` cobrirão:

- paciente lendo os próprios dados;
- paciente tentando ler dados de outro paciente;
- profissional clínico com vínculo ativo;
- profissional sem vínculo ou com vínculo inativo;
- `ADMIN` bloqueado;
- criação associada ao `sub` do paciente autenticado;
- profissional impedido de criar check-in do paciente;
- ausência de chamadas ao Prisma quando a autorização falha;
- preservação do cálculo de consistência e das consultas de registros do dia.

### 8.2 Testes HTTP de segurança

Será criada uma aplicação NestJS focada no módulo em teste, usando Supertest, JWT real de teste e Prisma simulado. Ela reproduzirá o `ValidationPipe` da aplicação e não dependerá de banco externo ou credenciais reais.

Os cenários HTTP cobrirão:

- requisição sem token retorna `401`;
- token inválido retorna `401`;
- paciente cria o próprio check-in;
- body contendo `patientId` retorna `400`;
- paciente consultando outro paciente retorna `403`;
- profissional vinculado consulta métricas;
- profissional sem vínculo retorna `403`;
- profissional tentando criar check-in retorna `403`;
- `ADMIN` retorna `403` nas rotas clínicas;
- nenhuma operação Prisma ocorre depois de uma negação.

### 8.3 Verificações finais

- testes específicos novos em estado verde;
- suíte unitária completa da API;
- suíte HTTP de segurança da fase;
- `npm.cmd run build` na API;
- lint dos arquivos modificados;
- `git diff --check`.

O lint global possui dívida técnica anterior. Falhas preexistentes fora dos arquivos modificados serão registradas, mas não ampliarão silenciosamente o escopo desta fase.

## 9. Critérios de aceite

A Fase 1 estará aceita quando:

- nenhuma rota de `metrics` responder sem JWT válido;
- um paciente não puder criar ou consultar métricas de outro paciente;
- o body de criação não aceitar `patientId`;
- um profissional clínico vinculado puder consultar métricas do paciente;
- profissional sem vínculo e `ADMIN` forem bloqueados;
- autorizações negadas não alcancem o Prisma;
- os cálculos e respostas válidas existentes de métricas forem preservados;
- testes unitários, testes HTTP e build passarem;
- nenhuma nova dependência, tabela ou migration for necessária.

## 10. Fora do escopo

- Migrar todos os controllers clínicos na mesma entrega.
- Unificar cookie e Bearer token em toda a aplicação.
- Criar auditoria persistente de acessos.
- Criar acesso clínico emergencial para `ADMIN`.
- Adotar CASL, Oso ou outro motor externo de políticas.
- Alterar schema Prisma, migrations ou estrutura de `DailyTracking`.
- Alterar regras, interfaces ou páginas do frontend além do necessário para manter o contrato seguro.
- Corrigir toda a dívida de lint da API.

## 11. Fases seguintes

Após validar o padrão em `metrics`, a migração seguirá por risco:

1. visão geral e dados de usuário/paciente;
2. avaliações físicas e fisioterapêuticas;
3. anamneses, exames laboratoriais e suplementos;
4. dietas, treinos e reabilitação, aplicando especialidade e propriedade na escrita;
5. logs e evolução, validando também integridade das relações entre plano, exercício, sessão e paciente;
6. alimentos e demais cadastros compartilhados;
7. testes de jornada cobrindo revogação de vínculo e consentimento.

Cada módulo deverá reutilizar a política central, adicionar seus testes de autorização e ser concluído antes de iniciar o próximo grupo.

## 12. Riscos e mitigação

- **Quebra do frontend ao remover `patientId` da criação:** localizar os consumidores antes da implementação e ajustar somente o payload, mantendo a rota.
- **Regra apenas no controller:** repetir a decisão de autorização no service antes do Prisma.
- **Vínculo geral virar escrita geral:** manter operações distintas de leitura, escrita por especialidade e propriedade.
- **Falso teste de segurança por guard simulado:** usar JWT real nos testes HTTP e simular apenas a persistência.
- **Dependência de banco tornar testes frágeis:** usar Prisma simulado nos testes da fase e verificar explicitamente chamadas e ausência de chamadas.
- **Escopo excessivo:** limitar a primeira entrega a `metrics` e ao contrato central estritamente necessário para protegê-lo.

## 13. Ordem de implementação

1. Criar os testes unitários do contrato central de leitura em estado RED.
2. Implementar a menor evolução necessária no `PatientAccessService`.
3. Criar testes unitários de autorização do `MetricsService` em estado RED.
4. Integrar autorização ao `MetricsService` e manter os testes verdes.
5. Criar os testes HTTP de JWT, papéis e DTO em estado RED.
6. Proteger o controller, criar o DTO e integrar o módulo.
7. Ajustar o consumidor frontend somente se ele ainda enviar `patientId` no check-in.
8. Executar a suíte completa, build, lint dos arquivos alterados e verificação do diff.
