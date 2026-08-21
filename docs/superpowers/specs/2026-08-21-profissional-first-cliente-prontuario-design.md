# SafeMove profissional-first e prontuário de cliente

**Data:** 2026-08-21
**Status:** desenho aprovado em conversa; implementação ainda não iniciada

## 1. Contexto

O SafeMove foi concebido como uma plataforma multidisciplinar na qual nutricionistas, personal trainers, fisioterapeutas e pacientes possuem contas e participam da jornada. O valor de diversos fluxos atuais depende de o paciente acessar o sistema, concluir tarefas e registrar refeições, treinos ou indicadores.

O novo posicionamento concentra o produto na ferramenta de trabalho do profissional. O sistema deve continuar entregando valor quando o cliente nunca acessa, responde ou registra nada. O profissional será o comprador e o único operador obrigatório; o paciente deixa de ser usuário e passa a ser um prontuário privado chamado `Client` no domínio e **Cliente** na interface.

## 2. Decisões aprovadas

- O produto atenderá nutricionistas, personal trainers e fisioterapeutas.
- Somente profissionais possuirão contas de uso do produto.
- Cada conta escolherá uma única atuação: `NUTRITIONIST`, `PERSONAL` ou `PHYSIO`.
- O primeiro MVP atenderá profissionais individuais, sem equipes de consultório.
- Cada profissional terá uma base privada de clientes.
- O cliente será um prontuário sem senha, papel, token ou portal.
- A entrega de dietas, treinos e reabilitações ocorrerá por PDF, impressão e compartilhamento manual pelo WhatsApp ou e-mail.
- A adaptação do produto atual será gradual, preservando módulos aproveitáveis.
- Equipes e espaços compartilhados poderão ser adicionados no futuro, mas não fazem parte deste MVP.

## 3. Objetivos

- Transformar o SafeMove na ferramenta de trabalho diária do profissional.
- Permitir cadastrar, consultar, atualizar e arquivar prontuários privados.
- Agilizar a criação de prescrições com modelos verdadeiramente reutilizáveis.
- Preservar avaliações, consultas, planos e versões anteriores no histórico.
- Permitir gerar documentos profissionais sem exigir conta do cliente.
- Adaptar a experiência à única especialidade selecionada pela conta.
- Garantir isolamento de dados entre profissionais em todos os módulos.
- Migrar o domínio atual sem remoção prematura de dados ou funcionalidades ainda utilizadas.

## 4. Fora do escopo do MVP

- Cadastro, autenticação ou portal do cliente.
- Agenda diária, check-ins, diário de refeições ou diário de treinos preenchidos pelo cliente.
- Chat entre profissional e cliente.
- Links públicos ou páginas de plano acessíveis pelo cliente.
- Equipes, convites, papéis internos ou compartilhamento entre consultórios.
- Prontuário multidisciplinar compartilhado entre profissionais independentes.
- Cobrança por membros de equipe.
- Envio automático de anexo por API do WhatsApp ou provedor de e-mail.
- Diagnóstico automático ou recomendação clínica produzida pelo sistema.

## 5. Abordagem escolhida

A solução adotará evolução gradual para uma entidade real de cliente. Ela preserva Next.js, NestJS, Prisma, PostgreSQL e os módulos de Nutrição, Treino e Reabilitação, mas separa progressivamente autenticação de prontuário.

Foram rejeitadas duas alternativas:

1. Manter clientes como usuários `PATIENT` invisíveis seria mais rápido no início, mas conservaria a confusão entre identidade autenticável e prontuário, além de tornar propriedade e autorização mais frágeis.
2. Reconstruir todo o produto descartaria código aproveitável, aumentaria prazo e elevaria o risco da migração.

## 6. Identidade e propriedade

### 6.1 `User`

`User` representará exclusivamente uma identidade autenticável que utiliza o produto.

- Papéis comerciais permitidos: `NUTRITIONIST`, `PERSONAL` e `PHYSIO`.
- Cada conta terá exatamente uma dessas atuações.
- `ADMIN` poderá permanecer como papel interno da plataforma.
- Novos cadastros não aceitarão `PATIENT`.
- Dados de autenticação, assinatura, perfil e identidade visual pertencem ao profissional.

### 6.2 `Client`

`Client` representará o prontuário administrado pelo profissional.

Campos conceituais iniciais:

- `id`;
- `professionalId` obrigatório;
- nome, e-mail e telefone;
- data de nascimento e gênero, quando informados;
- objetivo e informações relevantes à especialidade;
- observações privadas;
- `status` com `ACTIVE` ou `ARCHIVED`;
- datas de criação e atualização.

O cliente:

- não possui senha;
- não possui papel de acesso;
- não recebe JWT;
- não autentica;
- não possui fluxo autenticado para conceder ou revogar consentimentos;
- pode ter no prontuário evidências de autorizações, ciência ou outra base registrada pelo profissional;
- não precisa ter e-mail ou telefone globalmente único.

### 6.3 Relações

No MVP, a relação é direta:

```text
Professional 1 -> N Clients
Client 1 -> N Assessments
Client 1 -> N Consultation Notes
Client 1 -> N Plan Versions
Professional 1 -> N Plan Templates
```

O atual `ProfessionalPatientLink` não será necessário depois que todos os consumidores forem migrados. Ele só poderá ser removido na fase final, após verificação de que nenhuma rota, serviço ou dado ainda depende dele.

### 6.4 Isolamento

Toda operação de cliente combinará o identificador solicitado com o profissional derivado da autenticação:

```text
JWT -> professionalId + clientId -> recurso pertencente ao profissional
```

- `professionalId` enviado pelo frontend nunca será autoridade.
- Consultar somente por `clientId` não será suficiente.
- Um recurso pertencente a outra conta será tratado como não encontrado.
- Planos e registros guardarão `clientId` e autoria profissional.
- O profissional só acessará recursos da própria especialidade.

## 7. Experiência do profissional

### 7.1 Navegação comum

- **Início:** compromissos, retornos, planos vencendo e ações rápidas.
- **Clientes:** cadastro, busca, prontuários ativos e arquivados.
- **Agenda:** consultas, avaliações, retornos e tarefas do profissional.
- **Modelos:** modelos reutilizáveis da especialidade da conta.
- **Configurações:** perfil, identidade visual e dados usados nos PDFs.

### 7.2 Prontuário

O prontuário reunirá:

- visão geral e contato;
- anamnese e dados específicos da atuação;
- avaliações e comparação de evolução;
- plano ativo e histórico de versões;
- notas de consulta e observações privadas;
- acesso aos documentos regeneráveis de cada versão finalizada.

### 7.3 Especialidades

**Nutricionista**

- dietas e refeições;
- alimentos e composição nutricional;
- macronutrientes;
- anamnese e avaliações nutricionais.

**Personal trainer**

- treinos e divisões;
- exercícios, séries e repetições;
- avaliações físicas;
- evolução de medidas e desempenho registrado pelo profissional.

**Fisioterapeuta**

- avaliações fisioterapêuticas;
- planos de reabilitação;
- sessões, exercícios e orientações;
- evolução clínica registrada pelo profissional.

### 7.4 Jornada principal

```text
Cadastrar cliente
-> preencher prontuário ou avaliação
-> escolher modelo ou começar do zero
-> personalizar o plano
-> finalizar e ativar a versão
-> gerar PDF
-> imprimir ou compartilhar
```

Nenhuma etapa depende de ação do cliente.

## 8. Agenda, dashboard e alertas

A antiga agenda diária do paciente será substituída pela agenda operacional do profissional.

O dashboard poderá mostrar:

- compromissos do dia;
- retornos pendentes;
- avaliações desatualizadas;
- planos próximos do vencimento;
- clientes sem atendimento recente;
- ações rápidas de cadastro e prescrição.

Os alertas serão derivados de dados controlados pelo profissional. Não haverá alerta de adesão baseado em check-in, refeição ou treino que o cliente deveria registrar.

## 9. Planos e versões

Cada conta gerenciará apenas planos da sua especialidade. No MVP, cada cliente terá um único plano principal ativo dessa especialidade.

Estados de plano:

- `DRAFT`: editável e ainda não entregue;
- `ACTIVE`: versão final atualmente utilizada;
- `REPLACED`: versão final substituída por uma versão mais nova;
- `ARCHIVED`: plano encerrado manualmente e preservado no histórico.

Uma versão `ACTIVE`, `REPLACED` ou `ARCHIVED` será imutável. Para alterar um plano ativo:

1. o sistema copia a versão ativa para um novo `DRAFT`;
2. o profissional edita o rascunho;
3. ao finalizar, o rascunho passa a `ACTIVE`;
4. a versão ativa anterior passa a `REPLACED`.

O sistema não sobrescreverá nem excluirá uma versão já finalizada.

## 10. Modelos reutilizáveis

Um modelo será independente de clientes e planos ativos.

- Pertence ao profissional.
- É limitado à especialidade da conta.
- Não possui `clientId`.
- Pode ser criado do zero ou a partir de uma prescrição existente.
- Aplicar um modelo cria uma cópia profunda em um novo plano `DRAFT`.
- Alterar o rascunho não modifica o modelo.
- Alterar ou excluir o modelo não modifica planos anteriormente criados.

As cópias profundas devem ocorrer em transação para refeições e itens, divisões e exercícios, ou sessões e exercícios, conforme a especialidade.

## 11. PDFs e compartilhamento

O PDF será gerado somente a partir de uma versão finalizada e conterá:

- identidade visual e dados do profissional;
- identificação do cliente;
- tipo, título e versão do plano;
- data de emissão;
- conteúdo integral da prescrição;
- orientações e observações destinadas ao cliente.

O MVP não armazenará cópias binárias dos PDFs. Como versões finalizadas são imutáveis, o arquivo poderá ser regenerado a qualquer momento a partir do mesmo conteúdo.

Após gerar ou baixar o PDF, a interface oferecerá ações para abrir WhatsApp ou e-mail com uma mensagem preparada. O profissional continuará responsável por anexar ou confirmar o envio do arquivo. Integrações automáticas com provedores externos ficam fora do escopo.

## 12. Arquivamento e retenção

- Clientes com histórico não serão excluídos pela interface; serão arquivados.
- Planos finalizados não serão excluídos; serão substituídos ou arquivados.
- Excluir um modelo sem uso histórico não afeta qualquer plano criado a partir dele.
- Avaliações, notas e autoria profissional serão preservadas.
- Remoções permanentes, quando legalmente necessárias, exigirão fluxo administrativo separado e não fazem parte do MVP.

### 12.1 Auditoria mínima

O sistema registrará o profissional responsável e o horário das ações críticas:

- criação, alteração e arquivamento de cliente;
- criação e finalização de versão de plano;
- substituição ou arquivamento de plano;
- criação, alteração e exclusão de modelo;
- geração de PDF.

Esses registros não serão editáveis pela interface comum. Como o envio do PDF ocorre fora do sistema, abrir WhatsApp ou e-mail não será registrado como confirmação de entrega.

## 13. Tratamento de erros

- `400 Bad Request`: campos ausentes, inválidos ou não permitidos.
- `401 Unauthorized`: autenticação ausente, inválida ou expirada.
- `403 Forbidden`: conta autenticada tentando usar módulo de outra especialidade ou ação administrativa não permitida.
- `404 Not Found`: cliente ou recurso inexistente para o profissional autenticado, incluindo recurso pertencente a outra conta.
- `409 Conflict`: conflito de versão, ativação incompatível ou transição de estado inválida.

A interface apresentará mensagens acionáveis sem expor identificadores, existência ou conteúdo de recursos de outra conta.

## 14. Migração gradual

### 14.1 Fase 1 — Fundação profissional

- tornar as migrations reproduzíveis;
- escolher e unificar o mecanismo de autenticação;
- criar `Client` e a autorização central por proprietário;
- restringir registro a profissionais;
- implementar cadastro, listagem, edição e arquivamento de clientes;
- manter estruturas antigas durante a compatibilidade.

### 14.2 Fase 2 — Planos e documentos

- implementar estados e versões;
- implementar modelos independentes e cópia profunda;
- criar a geração compartilhada de PDF;
- migrar Nutrição;
- migrar Personal;
- migrar Fisioterapia;
- validar cada especialidade antes de iniciar a seguinte.

Nutrição vem primeiro por possuir o fluxo atual mais completo. Personal vem em seguida. Fisioterapia encerra essa fase por exigir mais reparos de permissões e interface.

### 14.3 Fase 3 — Ferramenta diária

- implementar agenda do profissional;
- adaptar dashboard;
- criar alertas operacionais;
- configurar identidade visual dos documentos;
- adicionar atalhos de compartilhamento.

### 14.4 Fase 4 — Retirada do paciente

- migrar dados existentes para prontuários privados;
- comparar quantidades e relações antes e depois;
- remover rotas e componentes da área do paciente;
- remover fluxos de check-in, diários e consentimentos controlados pelo paciente;
- remover `PATIENT` e `ProfessionalPatientLink` somente sem consumidores;
- preservar backups e um caminho de rollback.

As migrations serão aditivas no início. Colunas e tabelas antigas só serão removidas após backfill, troca de consumidores, testes e conferência dos dados.

### 14.5 Paciente atual ligado a vários profissionais

Se um usuário `PATIENT` atual estiver ligado a diferentes profissionais:

- será criado um `Client` privado por profissional;
- dados cadastrais necessários poderão ser copiados para cada prontuário;
- prescrições, avaliações e notas permanecerão com o profissional autor;
- registros sem autoria ou propriedade inequívoca serão reportados para tratamento explícito, sem associação automática arriscada.

## 15. Estratégia de testes

### 15.1 Unidade

- autorização por proprietário;
- transições de estado de planos;
- criação de nova versão;
- cópia profunda de modelos;
- seleção de conteúdo para PDF;
- regras de especialidade.
- geração de eventos de auditoria para ações críticas.

### 15.2 Integração da API

- duas contas não acessam clientes uma da outra;
- `professionalId` do body não altera propriedade;
- cada papel acessa somente o módulo permitido;
- ativar uma nova versão substitui a anterior em transação;
- falha durante cópia de modelo não deixa dados parciais;
- recurso de outra conta retorna `404`.

### 15.3 Jornadas de frontend

Para cada especialidade:

1. profissional registra e entra;
2. cadastra cliente;
3. preenche dados específicos;
4. cria plano do zero ou a partir de modelo;
5. finaliza uma versão;
6. gera o PDF;
7. cria uma nova versão sem alterar a anterior;
8. arquiva o cliente preservando histórico.

### 15.4 Migração e qualidade

- executar a migração em uma cópia dos dados;
- comparar contagens e chaves estrangeiras;
- comprovar rollback antes da remoção de estruturas antigas;
- validar Prisma e gerar o cliente;
- executar testes, TypeScript, lint e builds da API e do frontend;
- não considerar sucesso um build do Next.js que apenas ignore erros de TypeScript.

## 16. Critérios de sucesso do MVP

- O profissional consegue utilizar o produto sem qualquer conta ou ação do cliente.
- Um profissional nunca acessa dados pertencentes a outra conta.
- O cadastro conduz a uma única especialidade e a interface esconde os demais módulos.
- O profissional cadastra um cliente e cria uma prescrição completa.
- Um modelo reduz o trabalho sem permanecer ligado ao prontuário de origem.
- Uma nova versão preserva integralmente as versões anteriores.
- Todo plano finalizado pode ser regenerado em PDF.
- Cliente e plano com histórico podem ser arquivados sem perda de dados.
- Ações críticas preservam autoria profissional e horário.
- Nutrição, Personal e Fisioterapia possuem ao menos uma jornada completa validada.
- Estruturas antigas só são removidas depois de migração e verificação.

## 17. Decomposição para implementação

Este documento define a direção geral do produto e não deve ser convertido em uma única alteração extensa. Cada fase terá seu próprio plano executável, testes e critério de conclusão. O primeiro plano de implementação cobrirá apenas a **Fase 1 — Fundação profissional**. As fases seguintes só serão planejadas após a fundação estar validada.
