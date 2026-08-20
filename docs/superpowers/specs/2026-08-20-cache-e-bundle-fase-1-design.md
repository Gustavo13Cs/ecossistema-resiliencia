# Design: Fase 1 de Performance — Cache e Redução do Bundle

**Data:** 20 de agosto de 2026

**Status:** Aprovado em conversa; aguardando revisão da especificação escrita

**Produto:** Ecossistema Resiliência / SafeMove

## 1. Contexto

A lentidão foi observada somente em produção. As requisições terminam corretamente, sem respostas `429`, e os acessos seguintes ficam consideravelmente mais rápidos. Esse comportamento separa dois custos:

- a primeira resposta após inatividade pode incluir o cold start da API hospedada no Render gratuito;
- a navegação posterior ainda repete consultas e carrega JavaScript que não é necessário em todas as telas.

Esta fase atua somente no segundo custo. Ela não troca Vercel ou Render, não adiciona serviços pagos e não promete eliminar o cold start da primeira requisição.

## 2. Objetivos

- Reutilizar no navegador dados recém-consultados ao navegar entre telas.
- Evitar novas chamadas à API quando uma consulta equivalente ainda estiver válida.
- Atualizar apenas os caches afetados depois de uma mutação.
- Impedir que dados em cache sobrevivam à troca de usuário autenticado.
- Retirar Recharts do carregamento inicial das duas páginas pesadas priorizadas.
- Preservar contratos HTTP, autorização, comportamento clínico e aparência atual.
- Produzir evidência comparável de requisições, build e comportamento antes e depois.

## 3. Fora do escopo

- Alterar o plano, provedor, região ou configuração de cobrança da hospedagem.
- Usar pings periódicos para manter uma instância gratuita ativa.
- Reescrever páginas como React Server Components.
- Alterar banco, schema Prisma, migrations, índices ou consultas do backend.
- Modificar o rate limit da API sem evidência de `429`.
- Mudar autenticação, cookies, papéis, vínculos ou regras clínicas.
- Migrar todas as consultas do produto nesta entrega.
- Criar cache persistente em `localStorage`, IndexedDB, service worker ou servidor.

## 4. Abordagem escolhida

A aplicação web usará TanStack Query v5 como cache em memória para dados remotos. O Axios continuará sendo o cliente HTTP e os endpoints atuais serão preservados.

Um `QueryClientProvider` será montado acima do `AuthProvider` no layout raiz. O contexto de autenticação continuará responsável por `/auth/me`; ele não será convertido em query nesta fase. O cache será limpo quando o usuário sair ou quando a identidade autenticada mudar.

Os gráficos priorizados serão extraídos para componentes próprios e carregados com `next/dynamic`. A página entrega primeiro seu conteúdo essencial e mostra um placeholder discreto até o gráfico ficar disponível no navegador.

## 5. Política global do cache

O `QueryClient` terá estes padrões:

- `staleTime`: 60 segundos;
- `gcTime`: 5 minutos;
- `refetchOnWindowFocus`: desativado nesta fase;
- uma única nova tentativa para consultas GET com falha transitória de rede, `408`, `429` ou `5xx`;
- nenhuma repetição automática para mutações;
- cache somente em memória, perdido ao atualizar ou fechar a página.

Uma resposta `401` ou `403` não será repetida. Para `429`, a espera respeitará `Retry-After` quando ele for válido, com limite máximo de 5 segundos; a interface continuará exibindo o erro se a única repetição falhar.

Esses valores favorecem a navegação de ida e volta sem manter dados clínicos antigos por longos períodos.

## 6. Isolamento por sessão

As chaves de consulta incluirão a identidade do usuário autenticado para impedir colisões entre sessões. Uma fábrica central de chaves fornecerá nomes consistentes, por exemplo:

```text
users(sessionUserId)
patient(sessionUserId, patientId)
assessments(sessionUserId, patientId)
anamneses(sessionUserId, patientId)
diet(sessionUserId, patientId)
patientOverview(sessionUserId, patientId)
agenda(sessionUserId, scope, dateRange)
professionalAlerts(sessionUserId, filters)
```

O logout limpará o `QueryClient` antes de encaminhar para a tela pública. Se `/auth/me` hidratar uma identidade diferente da identidade anterior, o cache anterior também será removido. Dados clínicos não serão persistidos fora da memória da aba.

## 7. Consultas migradas

### 7.1 Lista de usuários

As telas Home, Membros, Dietas, Treinos e Avaliações compartilharão a mesma consulta para o `GET /users` sem parâmetros. Voltar a uma dessas telas em até 60 segundos deve reutilizar o resultado sem outra chamada ao endpoint.

Filtros e transformações específicas de tela continuarão locais e derivadas do mesmo resultado armazenado.

### 7.2 Ficha do paciente

A ficha continuará consultando paciente, avaliações e anamneses separadamente, porque são recursos e estados de erro distintos. As três queries iniciarão no mesmo render, sem waterfall, e o estado principal encerrará o carregamento quando os dados essenciais tiverem sido resolvidos.

Não será usado `Promise.all` apenas por aparência: as chamadas atuais já começam em paralelo. O ganho virá do cache, da reutilização ao retornar para a ficha e da separação do gráfico.

### 7.3 Hooks compartilhados

Serão migrados os hooks ou fluxos equivalentes de:

- dieta;
- visão 360 do paciente;
- agenda;
- alertas profissionais.

As assinaturas públicas usadas pelas páginas devem permanecer estáveis sempre que isso evitar mudanças amplas nos componentes consumidores. Comportamentos existentes de cancelamento e proteção contra respostas obsoletas serão preservados por meio do `signal` fornecido às query functions e por chaves que representem todo o escopo da consulta.

## 8. Mutações e invalidação

Cada mutação invalidará somente as famílias de queries que possam ter ficado desatualizadas:

- dieta e registros relacionados invalidam a dieta do paciente afetado;
- ações de agenda invalidam somente a agenda do paciente, profissional e intervalo correspondente;
- alterações que afetam a visão consolidada invalidam a visão 360 do paciente;
- operações que afetam alertas invalidam a lista de alertas do profissional.

Não será usado `queryClient.clear()` depois de uma operação comum. A limpeza total fica reservada para logout ou troca de identidade. Mutações não serão repetidas automaticamente, evitando duplicação de gravações.

Nesta fase, mutações bem-sucedidas usarão invalidação precisa, sem atualização otimista. Essa decisão preserva as respostas autoritativas atuais da API e reduz o risco de reproduzir no frontend regras clínicas ou de autorização.

## 9. Redução do bundle

O trabalho será limitado às rotas priorizadas no diagnóstico:

- ficha em `web/app/membros/[id]/page.tsx`;
- criação de dieta em `web/app/membros/[id]/nova-dieta/page.tsx`.

Os blocos que importam Recharts serão movidos para componentes client próprios. As páginas os carregarão com `next/dynamic` e `ssr: false`, com placeholder de tamanho estável para evitar salto visual. Nenhum gráfico será removido e seus dados, textos e interações permanecerão equivalentes.

Outras ocorrências de Recharts serão inventariadas, mas só entram nesta fase se forem dependência direta desses dois componentes. Uma migração geral de todos os gráficos exige uma fase separada.

## 10. Estados de interface e erros

- Dados válidos em cache permanecem visíveis durante uma revalidação discreta.
- O spinner de página cheia fica reservado ao primeiro carregamento sem dados.
- Um erro de uma consulta da ficha não deve apagar dados já carregados das outras consultas.
- Erros continuam usando o padrão de mensagem existente no produto.
- A ausência temporária do chunk do gráfico mostra o placeholder, não bloqueia formulários ou informações clínicas.
- O fluxo global de autenticação permanece como está, porque o `AuthProvider` já é persistido pelo layout raiz durante navegação normal.

## 11. Dependências e arquivos conceituais

Será adicionada somente a dependência de produção `@tanstack/react-query` compatível com React 19 e o ambiente atual.

As responsabilidades serão separadas em unidades pequenas:

- provider e configuração do `QueryClient`;
- fábrica de query keys;
- política de retry para consultas;
- integração do ciclo de sessão com limpeza do cache;
- hooks de dados por domínio;
- componentes dinâmicos dos gráficos;
- testes de comportamento de navegação e sessão.

Os nomes e caminhos exatos serão definidos no plano após mapear os consumidores atuais. Não será adicionada uma segunda biblioteca de cache ou outro cliente HTTP.

## 12. Testes e evidências

O desenvolvimento seguirá RED, GREEN e refatoração.

### 12.1 Comportamento

Testes Cypress interceptarão as rotas relevantes para provar que:

1. Home -> Membros -> outra rota -> Membros, dentro de 60 segundos, não repete `GET /users` sem invalidação.
2. Abrir uma ficha, sair e retornar dentro de 60 segundos reutiliza paciente, avaliações e anamneses.
3. Uma mutação invalida somente as queries relacionadas e refaz a consulta necessária.
4. Logout e login com outro usuário não exibem nem reutilizam dados da sessão anterior; o teste usará respostas interceptadas de autenticação e não dependerá de contas ou credenciais reais.
5. A ficha e Nova Dieta exibem conteúdo essencial enquanto o gráfico dinâmico carrega.

Se um fluxo Cypress existente não permitir observar uma regra isoladamente, será criado um teste de componente ou unidade mínimo com a infraestrutura estritamente necessária; não será incluído um framework de testes adicional sem necessidade demonstrada.

### 12.2 Verificação estática

- `npx.cmd tsc --noEmit` no projeto web;
- lint dos arquivos alterados e, ao final, lint completo quando o baseline permitir;
- `npm.cmd run build` no projeto web;
- `git diff --check`;
- confirmação de que as páginas priorizadas não importam Recharts estaticamente.

### 12.3 Comparação de produção

Antes e depois do deploy serão registrados:

- número de chamadas aos endpoints priorizados em uma navegação repetida;
- duração da primeira resposta após inatividade;
- duração da segunda abertura da mesma tela;
- erros HTTP observados.

A duração da primeira resposta será informativa: ela poderá continuar alta no Render gratuito. O aceite desta fase depende da redução de chamadas repetidas e do carregamento inicial das páginas priorizadas, não da eliminação do cold start.

## 13. Critérios de aceite

A Fase 1 estará aceita quando:

- o cache for isolado por usuário e limpo na troca de sessão;
- consultas equivalentes reutilizarem dados por 60 segundos;
- mutações não tiverem retry automático e invalidarem apenas dados relacionados;
- os fluxos migrados preservarem seus contratos e estados de erro;
- ficha e Nova Dieta não incluírem Recharts no chunk inicial da página;
- testes de comportamento, TypeScript e build passarem;
- nenhuma mudança tiver sido feita em API, banco, rate limit, hospedagem ou regras clínicas;
- as limitações do cold start permanecerem documentadas no handoff.

## 14. Riscos e mitigação

- **Vazamento entre sessões:** chaves por identidade e limpeza total em logout/troca de usuário.
- **Dados antigos após gravação:** mapa explícito de invalidação por mutação.
- **Requisições duplicadas durante migração:** uma única fonte de dados por recurso e remoção do `useEffect` substituído.
- **Regressão de agenda por respostas fora de ordem:** query keys completas e cancelamento via `AbortSignal`.
- **Bundle apenas deslocado, sem ganho perceptível:** componentes dinâmicos limitados aos gráficos e medição das rotas priorizadas.
- **Confundir cold start com regressão do frontend:** medir primeira e segunda resposta separadamente.
- **Escopo excessivo:** não migrar endpoints ou gráficos não listados sem evidência de dependência direta.

## 15. Ordem de implementação

1. Criar os testes de contagem de requisições e isolamento de sessão em estado RED.
2. Adicionar provider, política do QueryClient e query keys.
3. Integrar limpeza de cache ao ciclo de autenticação.
4. Migrar a consulta compartilhada de usuários.
5. Migrar ficha do paciente e hooks compartilhados priorizados.
6. Migrar mutações e invalidações relacionadas.
7. Extrair e carregar dinamicamente os gráficos das duas rotas.
8. Executar testes completos, TypeScript, lint, build e registrar comparação.

Cada etapa deve manter os contratos atuais e terminar com evidência própria antes da próxima.
