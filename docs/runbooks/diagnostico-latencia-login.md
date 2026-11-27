# Latência do login e da abertura dos painéis

Análise de 26/11/2026 sobre a revisão `53e70a9`. A conta do ensaio era de personal trainer e tinha a carteira vazia. Os números abaixo são do laboratório.

## O que o navegador espera

Ao abrir o formulário, o provedor consulta a sessão em segundo plano. Uma visita anônima pode gerar `GET /auth/me`, `GET /auth/csrf` e `POST /auth/refresh` antes de a pessoa entrar. O formulário já está disponível no HTML. Somar essas três requisições ao tempo contado a partir do clique superestimaria a espera quando elas terminam enquanto a pessoa digita. [Renderização pública](performance-20-public-rendering.md) · [Recuperação de sessão](../../web/lib/api.ts)

Depois do clique, o formulário aguarda o POST e chama o provedor, que espera outro GET de identidade para navegar. A API já criou a sessão e escreveu seus cookies quando devolve a mensagem de sucesso. No painel de treinamento, o cabeçalho pode aparecer antes da agenda e do resumo. A ação “Nova prescrição” depende do resumo e da existência de alunos ativos. [Formulário](../../web/app/auth/login/page.tsx) · [Provedor](../../web/contexts/auth-context.tsx) · [Painel](../../web/components/features/training/PersonalDashboard.tsx)

## Ensaio de API

Aplicação NestJS com o módulo raiz, guards, validação, cookies, CSRF, Prisma e PostgreSQL 16.16 local. O banco temporário recebeu 30 migrations e papéis distintos de autenticação, aplicação clínica e tarefas. O cadastro normal criou a conta com bcrypt de custo 12. Foram quatro ciclos por cenário após inicialização, todos com sucesso. A instrumentação contou chamadas do driver PostgreSQL e invocações de `validateAccess` durante cada requisição. A contagem SQL inclui comandos de transação. Os endpoints foram cronometrados individualmente pelo cliente HTTP.

| Requisição | Validações de sessão | Comandos SQL | Mediana local | Mediana com 116 ms de latência adicionada por ida e volta API–banco |
|---|---:|---:|---:|---:|
| POST /auth/login | 0 | 6 | 243 ms | 948 ms |
| GET /auth/me | 2 | 4 | 4,5 ms | 484 ms |
| GET /workouts/workspace | 2 | 13 | 8 ms | 1.542 ms |
| GET /appointments, período de um dia | 2 | 10 | 8,5 ms | 1.198 ms |

O segundo cenário introduziu 58 ms em cada direção no transporte entre API e banco. A escolha usa como referência os 116,13 ms de mediana de um SQL simples aquecido na sonda regional de 17/11. Uma sonda de SQL e um atraso fixo de transporte são aproximações diferentes. O ensaio não mede congestionamento real, despertar do Render, rede móvel, Vercel ou uma carteira com dados. As duas consultas do painel podem se sobrepor. [Medição regional e limites](performance-19-regional-migration.md)

## Do clique ao conteúdo visível

Três entradas em contextos novos do Chromium, viewport de 390 × 844, aplicação Next compilada em modo de produção com Webpack, API aquecida e o mesmo atraso controlado de 116 ms no caminho do banco. Cada entrada começou com o formulário hidratado e a verificação anônima concluída. O relógio iniciou no evento de clique. Um observador no DOM marcou o primeiro aparecimento de cada conteúdo visível. A fonte usou substituição local no build de teste. O ensaio não incluiu inatividade do servidor nem limitação de CPU de um telefone físico.

| Marco após “Entrar” | Ensaio 1 | Ensaio 2 | Ensaio 3 | Mediana |
|---|---:|---:|---:|---:|
| Título “Área de treinamento” | 1.670 ms | 1.501 ms | 1.484 ms | 1.501 ms |
| Agenda informa que não há compromissos | 3.155 ms | 2.734 ms | 2.705 ms | 2.734 ms |
| Resumo da base visível | 3.383 ms | 3.062 ms | 3.045 ms | 3.062 ms |

As quatro operações de API retornaram HTTP 200 nas três entradas. A conexão ao domínio de produção foi recusada pelo proxy do ambiente antes de alcançar a aplicação. Passaram também 55 testes existentes do cliente HTTP, provedor de autenticação e painel de treinamento.

## Prioridades de otimização

1. **Aproveitar a resposta de criação da sessão.** O POST pode acrescentar identidade e CSRF à mensagem atual, aproveitando os valores já calculados pelo servidor, como o refresh faz hoje. Isso tira do caminho crítico uma chamada HTTP e quatro comandos SQL neste cenário. Os tokens de acesso e renovação continuam em cookies HttpOnly. O primeiro acesso protegido deve tratar cookie recusado, conta trocada ou sessão revogada. A hidratação ao recarregar e a coordenação entre abas continuam necessárias. [Controlador](../../api/src/modules/auth/auth.controller.ts) · [Contexto](../../web/contexts/auth-context.tsx)
2. **Fazer uma autenticação por requisição protegida.** O registro global e o decorador de rota executam a mesma estratégia JWT. No ensaio, cada um dos três GETs protegidos passou duas vezes por ela. Com a configuração medida do Prisma, cada validação lê sessão e usuário. Uma implementação pode reutilizar o resultado bem-sucedido exclusivamente dentro daquela requisição, com cobertura de revogação entre requisições, papéis, acesso cruzado e logout. Após retirar o GET pós-login, o benefício adicional recai sobretudo em resumo e agenda. [Registro global](../../api/src/app.module.ts) · [Guard](../../api/src/common/guards/jwt-auth.guard.ts) · [Validação de acesso](../../api/src/modules/auth/auth-session.service.ts)
3. **Reduzir viagens ao banco.** No POST, uma leitura localiza o usuário pelo e-mail. Depois da comparação da senha, a transação trava a linha do usuário, relê seus campos e cria a sessão. É possível avaliar uma única leitura com bloqueio que também retorne os campos e confira a versão atual. No resumo do Personal, cinco operações montam três contagens e duas listas. Elas compartilham a conexão da mesma transação clínica. O primeiro candidato é agregar as contagens e preservar o filtro por profissional, a ordenação das prévias e a consistência do resumo. Medir também com carteiras grandes antes de escolher o SQL. [Criação da sessão](../../api/src/modules/auth/auth-session.service.ts) · [Resumo de treino](../../api/src/modules/workouts/training-read.service.ts) · [Transação clínica](../../api/src/infra/database/prisma.service.ts)
4. **Distinguir o primeiro acesso após inatividade.** O último desenho de produção documenta API Render Free na Virgínia e banco em São Paulo. Comparar primeiro acesso após repouso e acessos subsequentes com o serviço ativo. Se o excesso se concentrar no despertar, uma instância sempre ativa atua nessa parcela. Se persistir no serviço aquecido, a quantidade de viagens SQL e a proximidade das duas camadas ganham importância. [Configuração versionada](../../ops/render/api-virginia.yaml) · [Histórico regional](performance-19-regional-migration.md)

Em 15 comparações locais isoladas com bcrypt de custo 12, a mediana foi 219 ms. A prioridade proposta mantém o custo de verificação da senha.

## Resultado após a alteração do login

A API passou a devolver a identidade, o CSRF e um resumo criptográfico calculado sobre os cookies de acesso e CSRF que acabou de emitir. Depois do POST, o navegador faz um HEAD no próprio formulário. O proxy do frontend compara o resumo com os cookies recebidos e confirma a entrega sem acessar o banco. Se a resposta tiver o formato antigo ou a confirmação local falhar, o frontend volta a consultar a identidade pela API. A criação da sessão também passou a ler os dados atuais do usuário no mesmo SELECT que bloqueia a linha e confere a versão usada na verificação de senha.

Repetindo o ensaio com o mesmo perfil Personal, carteira vazia, API aquecida e atraso de 116 ms entre API e banco, os três tempos do clique até o título foram **1.110, 935 e 907 ms**. A mediana caiu de **1.501 para 935 ms** (566 ms, 37,7%). Nas três entradas, o HEAD confirmou os cookies e o navegador abriu o painel sem consultar `/auth/me` após o POST. A abertura do formulário e o despertar da hospedagem ficam fora dessa medida.

Também foram verificados no Chromium o formato de resposta legado, com entrada pelo fluxo anterior, e a recusa dos cookies recém-emitidos, com permanência no formulário e mensagem específica. Passaram 84 testes focados do frontend, 46 testes unitários de autenticação da API e 11 testes de sessão via HTTP com PostgreSQL. A medição de produção depende da publicação de API e frontend.

## Outras oportunidades por perfil

- **Nutrição.** O painel percorre as páginas de clientes ativos e arquivados, em lotes de 100, aguarda ambas as listas e ordena os ativos no navegador para exibir cinco recentes. Um resumo que devolva os totais globais e os cinco recentes teria resposta pequena independentemente do tamanho da carteira. [Carregamento das listas](../../web/hooks/features/useClients.ts) · [Preparação do painel](../../web/hooks/features/useProfessionalDashboard.ts)
- **Fisioterapia.** O workspace lê toda a carteira ativa em uma consulta que inclui até 20 avaliações e 20 evoluções por paciente. Avaliar o cálculo no banco dos sinais necessários para o painel com uma carteira sintética maior, comparando contagens e ordem de prioridade com as regras clínicas atuais. [Consulta da carteira](../../api/src/modules/rehab-plans/physio-read.service.ts)
- **Seleção de aluno no Personal.** Abrir “Nova prescrição” carrega os alunos ativos e filtra nomes no navegador. Essa lista já é adiada até abrir o seletor. Para carteiras grandes, reaproveitar a busca paginada no servidor pode reduzir a espera dessa ação específica. [Seletor de alunos](../../web/components/features/training/WorkoutClientPicker.tsx)

## Como verificar o ganho em produção

Registrar separadamente o clique, a resposta do POST, a confirmação de identidade quando houver, o primeiro título do painel e a disponibilização dos dados. Comparar p50 e p95 com volume de amostras, perfil, dispositivo e estado da API. Para a API, incluir na medição a passagem pelos guards. O interceptor atual inicia a telemetria depois dessa etapa e retorna cedo nas rotas de autenticação, antes da emissão opcional de Server-Timing. O tempo observado no navegador inclui também espera anterior ao processo Nest. [Interceptor](../../api/src/common/clinical-context/clinical-context.interceptor.ts) · [Web Vitals existentes](performance-30-rum-web-vitals.md)
