# SafeMove: redesign profissional do frontend

**Data:** 24 de agosto de 2026

**Status:** aprovado pelo usuário em 24 de agosto de 2026

**Superfície inicial:** `web/`

**Modo:** Operate

**Direção:** SaaS Clínico Contemporâneo
**Composição aprovada:** `.impeccable/mocks/dashboard-comp-01.png`

## 1. Resumo

O frontend do SafeMove será reconstruído como um workspace profissional-first para Nutricionistas, Personal Trainers e Fisioterapeutas. As três profissões usam a mesma fundação de produto e o mesmo design system, mas cada conta enxerga apenas navegação, dados e ações pertinentes à atuação escolhida no cadastro.

A modernização será incremental. A primeira fase entrega a fundação visual e de segurança, landing, autenticação, app shell, dashboard, lista de clientes e estrutura inicial do prontuário. Dietas, treinos, avaliações, reabilitação e demais fluxos clínicos serão migrados em fases seguintes, sem consolidar os fallbacks legados como arquitetura final.

Cada incremento deve usar Red, Green e Refactor. A fase só fecha com validação Cypress E2E real contra frontend, API e PostgreSQL de teste.

## 2. Problemas confirmados no estado atual

### 2.1 Posicionamento e linguagem

- `web/app/page.tsx` ainda apresenta o produto como plataforma corporativa de RH, saúde mental e métricas agregadas.
- Login e cadastro ainda usam linguagem como “B2B”, “e-mail corporativo” e consultório/empresa sem uma narrativa profissional consistente.
- O README e a fundação atual definem o produto como professional-first, com prontuários `Client` privados por proprietário.

### 2.2 Dashboard e informação

- `web/app/home/page.tsx` mistura terminologia nova e legada.
- Alertas são exibidos como zero fixo e a inatividade é aproximada a partir da quantidade de registros, não de atividade real.
- O dashboard sugere que todos os clientes estão em dia sem evidência suficiente.
- A tela usa muitos cards de igual peso e não estabelece uma próxima ação profissional clara.

### 2.3 Separação por profissão

- A sidebar filtra parte dos itens por papel, mas o prontuário e hooks legados ainda agregam recursos de múltiplas áreas.
- O usuário confirmou que uma profissão não deve ver conteúdo de outra profissão.
- A ausência visual de uma opção não pode ser tratada como autorização; a API precisa impor o mesmo limite.

### 2.4 Privacidade e segurança

- `web/app/clientes/[id]/nova-dieta/page.tsx` persiste rascunhos clínicos em `localStorage`.
- `web/hooks/features/useClientRecord.ts` tenta `/users/:id` quando `/clients/:id` falha, reabrindo um caminho legado e tornando falhas de autorização indistinguíveis de migração.
- Algumas consultas convertem qualquer erro em `null` ou lista vazia.
- O cookie `HttpOnly` é a direção atual correta, mas a política CSRF precisa ser alinhada ao domínio real de produção.

### 2.5 Qualidade e manutenção

- O frontend não consegue executar `npm run lint` porque o executável ESLint não está instalado no pacote atual.
- Há páginas monolíticas, incluindo prontuário e prescrição dietética com aproximadamente mil linhas.
- A prescrição dietética contém texto corrompido por encoding.
- TypeScript explícito passou na auditoria inicial, mas isso não substitui lint, testes e build de produção.

## 3. Objetivos

1. Alinhar a interface ao produto professional-first atual.
2. Dar igual qualidade às três profissões sem misturar seus domínios.
3. Tornar a próxima ação e o contexto do cliente mais importantes que métricas decorativas.
4. Exibir apenas dados reais, autorizados e semanticamente honestos.
5. Reduzir risco de vazamento por navegação, cache, armazenamento local, logs e fallbacks legados.
6. Atender WCAG 2.2 AA de celular a desktop.
7. Criar componentes e tokens reutilizáveis para as fases seguintes.
8. Fechar cada incremento com Red, Green, Refactor e E2E real.

## 4. Não objetivos da primeira fase

- Reescrever todos os fluxos de dieta, treino e reabilitação.
- Criar uma colaboração multiprofissional inexistente.
- Exibir agenda, alertas ou métricas sem endpoint autorizado e sem semântica comprovada.
- Criar templates reutilizáveis novos, relatórios, PDFs avançados ou compartilhamento automático.
- Inventar depoimentos, conformidade, criptografia, resultados clínicos ou alegações comerciais.
- Substituir autorização no servidor por controles de interface.

## 5. Princípios do produto

1. Um produto, três atuações igualmente respeitadas.
2. Um workspace contém somente o domínio da profissão autenticada.
3. O cliente e o trabalho real vêm antes da decoração.
4. “Sem dados”, “não disponível” e “não autorizado” são estados diferentes.
5. Privacidade e segurança precisam ser percebidas e verificadas.
6. O frontend migra em fases sem reintroduzir modelos legados por conveniência.

## 6. Direção visual

### 6.1 Referências de acabamento

- Linear: velocidade, atalhos e hierarquia de workspace.
- Stripe Dashboard: navegação por recursos, busca, listas, detalhes e estados operacionais.
- Cliniko: relação prática entre agenda, prontuário e rotina de profissionais de saúde.

Essas referências calibram qualidade e comportamento. Não autorizam copiar identidade, layout ou funcionalidades ausentes.

### 6.2 Linguagem

- Fundo principal branco ou neutro frio muito claro.
- Texto principal azul-marinho profundo.
- Azul-petróleo para ação primária, foco e seleção.
- Coral apenas para erro ou risco que realmente exija atenção.
- Bordas suaves, sombras mínimas e hierarquia baseada em espaço, contraste e tipografia.
- Ícones lineares consistentes; nenhum emoji como elemento de navegação.
- Sem gradientes decorativos, glassmorphism, bento grid ou excesso de cantos arredondados.
- Uma identidade única para o SafeMove. A profissão altera conteúdo e terminologia, não cria três temas desconectados.

### 6.3 Tokens iniciais

Os valores finais serão amostrados do comp aprovado durante a implementação. A intenção inicial é:

- Ink: próximo de `#0F172A`.
- Brand/action: próximo de `#0F766E`.
- Surface: `#FFFFFF`.
- Border/muted: próximo de `#E2E8F0`.
- Success, warning e danger usam cores semânticas testadas em contraste AA.
- Raio pequeno e médio; raio grande reservado a diálogos e superfícies de destaque.
- Tipografia sans humanista ou grotesca contemporânea via `next/font`, sem depender de fallback não carregado.

### 6.4 Composição aprovada

O usuário aprovou “Visão geral equilibrada”. O primeiro viewport combina:

1. Sidebar profissional.
2. Cabeçalho com identidade da atuação, busca e base privada.
3. Ações pertinentes à profissão.
4. Resumo baseado em dados reais.
5. Área de clientes recentes ou outra informação disponível.

O comp não aprova agenda, nomes, valores ou contadores demonstrativos. Um bloco só entra quando houver fonte real, autorização e teste. Caso contrário, deve ser omitido, substituído por recurso existente ou apresentar estado vazio honesto.

## 7. Arquitetura de informação

### 7.1 Superfícies públicas

#### Landing

- Posicionar SafeMove como workspace para profissionais.
- Explicar as três atuações sem sugerir prontuário compartilhado.
- Chamada principal para cadastro ou login.
- Somente provas e capacidades confirmadas.

#### Login

- “Entrar no SafeMove”, e-mail e senha.
- Mensagem genérica para credenciais inválidas.
- Erros de rede e indisponibilidade distintos.
- Link para cadastro profissional.

#### Cadastro

- Escolha obrigatória de uma única atuação.
- Nome, contato e credenciais.
- Requisitos de senha visíveis antes do envio.
- Textos coerentes para profissional autônomo, consultório ou estúdio.

### 7.2 App shell autenticado

- Nome SafeMove.
- Atuação autenticada.
- Busca de cliente no desktop e acesso equivalente no mobile.
- Navegação restrita ao papel.
- Indicador discreto de base privada.
- Conta, configurações e saída separadas das tarefas clínicas.
- No mobile, menu acessível em vez de reservar um item primário para logout.

### 7.3 Matriz de navegação

| Atuação | Navegação elegível |
|---|---|
| Nutricionista | Início, Clientes, Avaliações, Planos alimentares, Alimentos |
| Personal Trainer | Início, Alunos, Avaliações, Planilhas; Exercícios somente quando houver rota real |
| Fisioterapeuta | Início, Pacientes, Avaliações, Reabilitação; Evoluções somente quando houver rota real |
| Administrador | Painel administrativo isolado; nenhuma área clínica |

Um item sem rota e autorização completas não aparece como navegação desabilitada ou promessa falsa.

## 8. Superfícies da primeira fase

### 8.1 Dashboard

- Ações rápidas específicas da profissão.
- Clientes recentes somente quando o critério puder ser calculado com dado real.
- Contagens apenas de endpoints confiáveis.
- Estados vazios com uma ação útil.
- Nenhum alerta fixo, inatividade aproximada ou afirmação de evolução clínica.

### 8.2 Lista de clientes

- Busca por nome e campos permitidos.
- Filtros de ativos e arquivados.
- Tabela no desktop e lista no mobile.
- Cadastro como ação primária.
- Restauração e arquivamento com confirmação e feedback.
- Campos sensíveis limitados ao necessário para a tarefa.

### 8.3 Prontuário

- Cabeçalho com nome, status e ações permitidas.
- Resumo e abas específicos da profissão.
- Recurso não migrado fica ausente ou explicitamente indisponível.
- Nenhum fallback automático para `User` ou modelo de paciente legado.
- Componente grande deve ser dividido por domínio e estado, não apenas por seção visual.

## 9. Componentes e limites

### 9.1 Fundação

- `AppShell`: estrutura autenticada e responsiva.
- `ProfessionalNavigation`: matriz de itens por papel.
- `WorkspaceHeader`: atuação, busca, privacidade e conta.
- `PageHeader`: título, descrição e ação principal.
- `AsyncState`: loading, empty, error, forbidden e not-found.
- `ConfirmActionDialog`: arquivamento, restauração e ações sensíveis.

### 9.2 Dashboard

- `ProfessionalDashboard`: orquestra módulos permitidos.
- `QuickActions`: recebe ações tipadas por profissão.
- `DashboardSummary`: aceita somente métricas acompanhadas de fonte e estado.
- `RecentClients`: lista real com ação de abertura.

### 9.3 Clientes

- `ClientFilters`.
- `ClientList` com renderizações desktop/mobile.
- `ClientListItem`.
- `ClientRecordHeader`.
- Seções do prontuário separadas por domínio profissional.

Cada unidade deve expor propósito, entradas tipadas, estados e dependências sem exigir leitura de sua implementação.

## 10. Fluxo de dados

```text
Componente
  -> hook tipado
    -> cliente HTTP
      -> API autenticada e autorizada
        -> resposta validada
          -> cache isolado por usuário
```

Regras:

- Query keys incluem o identificador da sessão e os parâmetros relevantes.
- Login, logout, expiração e troca de usuário limpam o cache.
- Nenhum cache clínico é persistido no navegador.
- `401`, `403/404`, `5xx`, rede indisponível e lista vazia não compartilham fallback.
- Hooks não convertem erro de acesso em ausência de conteúdo.
- Tipos de API não usam `any` para esconder incompatibilidades de migração.

## 11. Segurança e privacidade

### 11.1 Sessão

- Preservar cookie `HttpOnly`.
- Não devolver nem armazenar token em JavaScript.
- Tratar `401` de forma centralizada, evitando loops durante `/auth/me` e logout.

### 11.2 Autorização

- Frontend filtra navegação e ações para reduzir erro humano.
- API valida papel, propriedade do `Client` e propriedade do recurso derivado.
- Recurso de outra conta responde como não encontrado quando isso evita enumeração.
- Testes acessam URLs e endpoints diretamente; não dependem somente do menu.

### 11.3 Armazenamento e logs

- Interromper persistência de rascunhos clínicos em `localStorage`.
- Definir migração segura antes de remover rascunhos já existentes, evitando apagar trabalho silenciosamente.
- Preferir rascunho no servidor ligado ao proprietário quando esse recurso for implementado.
- Logs e toasts não contêm dados clínicos desnecessários.

### 11.4 Navegador e rede

- CSP com `frame-ancestors`, fontes e conexões explicitamente permitidas.
- `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` adequadas.
- CORS restrito às origens autorizadas.
- Se produção puder usar contexto same-site, adotar `SameSite` mais restritivo.
- Se a arquitetura exigir cookie cross-site, validar origem e usar proteção CSRF explícita.

## 12. Acessibilidade e responsividade

- WCAG 2.2 AA.
- Operação completa por teclado.
- Foco sempre visível e ordem lógica.
- Landmarks, títulos, labels e nomes acessíveis.
- Tabelas com cabeçalhos e alternativa responsiva sem perda de contexto.
- Alvos de toque adequados.
- Erros associados aos campos.
- Cores de estado acompanhadas de texto ou ícone.
- `prefers-reduced-motion` respeitado.
- Layouts verificados em desktop e mobile; tablet quando a composição mudar materialmente.

## 13. Estratégia Red, Green e Refactor

### 13.1 Red

- Escrever o teste do comportamento aprovado.
- Executá-lo e registrar falha pela razão esperada.
- Não aceitar falha de ambiente, selector ou seed como evidência Red.

### 13.2 Green

- Implementar o mínimo correto.
- Executar o teste focal e a suíte relacionada.
- Registrar a passagem.

### 13.3 Refactor

- Melhorar nomes, tipos, composição e duplicação.
- Manter a suíte verde.
- Não alterar comportamento sem novo Red.

## 14. Camadas de teste

### Frontend unitário e integração

- Vitest e React Testing Library.
- Matriz de navegação por profissão.
- Estados de loading, vazio, erro e acesso negado.
- Formulários, diálogos e limpeza de cache.
- Componentes clientes e hooks; componentes assíncronos do App Router permanecem cobertos prioritariamente por E2E.

### API

- Jest no NestJS.
- Sessão, papel, propriedade do cliente e recursos derivados.
- Contas cruzadas e enumeração.
- CSRF/origem conforme topologia escolhida.

### Cypress E2E real

- Build de produção do Next.js.
- API NestJS real.
- PostgreSQL de teste recriado por migrations.
- Seeds sintéticos determinísticos.
- Sem mocks nos fluxos principais.

Jornadas obrigatórias:

1. Cadastro, login, hidratação e logout.
2. Navegação correta para as três profissões.
3. Ausência de módulos de outras profissões.
4. Criar, editar, arquivar e restaurar cliente.
5. Conta A não lista nem acessa cliente da conta B.
6. Sessão expirada não deixa dados anteriores na tela ou cache.
7. Estados de erro e vazio são semanticamente distintos.
8. Nenhum token ou dado clínico sensível é persistido em `localStorage`.
9. Teclado, foco e varredura automatizada de acessibilidade.
10. Fluxos críticos em desktop e mobile.

## 15. Gate de conclusão

A fase só pode ser declarada concluída quando passam:

- ESLint funcional e sem erros no escopo alterado.
- `tsc --noEmit` explícito.
- Testes unitários e de integração do frontend.
- Testes da API relacionados à autorização.
- Build de produção sem ignorar erros de TypeScript.
- Cypress E2E completo contra infraestrutura real de teste.
- Verificação visual batelada em desktop e mobile.
- Detector Impeccable no escopo alterado.
- Revisão final independente do Impeccable.

## 16. Sequenciamento conceitual

1. Restaurar gates de qualidade e criar testes Red da fundação.
2. Consolidar tokens e componentes base.
3. Separar layout público e autenticado.
4. Modernizar landing, login e cadastro.
5. Implementar app shell e matriz de navegação.
6. Modernizar dashboard com dados reais.
7. Modernizar lista de clientes.
8. Dividir e restringir o prontuário por profissão.
9. Aplicar correções transversais de segurança.
10. Executar E2E, acessibilidade, capturas e revisão final.

O plano de implementação posterior definirá tarefas, arquivos, testes Red exatos e commits. Este documento define o comportamento e os limites aprovados.

## 17. Critérios de aceitação

- O produto público não se apresenta como plataforma corporativa de RH.
- Cada profissão vê somente seu domínio.
- Administrador não acessa superfícies clínicas.
- Dashboard não mostra valores fixos ou aproximações como dados reais.
- Lista e prontuário usam somente `Client` e recursos autorizados.
- Acesso cruzado entre contas falha no frontend e na API.
- Nenhum novo dado clínico é gravado em armazenamento persistente do navegador.
- Os estados assíncronos são distinguíveis e acessíveis.
- O visual corresponde ao comp aprovado sem literalizar conteúdo demonstrativo.
- WCAG 2.2 AA é verificado no escopo da fase.
- A fase possui evidência Red, Green, Refactor e Cypress E2E real.

## 18. Decisões fechadas

- Nome preservado: SafeMove.
- Identidade atual pode ser substituída integralmente.
- Direção: SaaS Clínico Contemporâneo.
- Composição: Visão geral equilibrada.
- Build path: comp-first.
- Três profissões com igual protagonismo e workspaces separados.
- Entrega em fases.
- WCAG 2.2 AA.
- Red, Green, Refactor e E2E real obrigatórios.

Todas as decisões funcionais e visuais necessárias para este design estão fechadas. A auditoria do plano confirmará quais endpoints e migrations atuais sustentam cada bloco antes da implementação correspondente.
