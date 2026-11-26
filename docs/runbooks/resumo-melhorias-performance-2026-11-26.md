# SafeMove — Relatório consolidado das melhorias de performance

**Data de consolidação:** 26/11/2026, horário de Fortaleza.

**Período das entregas resumidas:** 16 a 21/11/2026.

**Branch:** `agent/codex/performance-diagnosis`.

**Revisão remota consolidada:** `d72036b` (21/11/2026). As medições antigas continuam vinculadas aos commits e fixtures de cada etapa.

Este documento reúne o que foi implementado, o motivo de cada mudança, os números registrados e os limites das conclusões. Ele consolida os relatórios e as evidências existentes; **não é uma nova medição de produção em 26/11/2026**.

**O item 14 — atualização otimista — foi desconsiderado neste resumo, conforme solicitado.** A tentativa local iniciada pelo Codex foi descartada. Durante a consolidação, foi encontrada na branch remota uma implementação independente desse item, de outro agente, em `b775819`/`48738d4`. Essa alteração remota foi preservada ao sincronizar a branch e **não é contabilizada nem avaliada como ganho neste documento**. Descartar a tentativa local e excluir o item deste relatório não significa reverter aquele commit remoto.

## 1. Visão geral dos resultados

O trabalho atacou diferentes partes da lentidão: consultas repetidas no backend, distância entre API e banco, JavaScript carregado antes da necessidade, imagens maiores que o tamanho exibido, chamadas duplicadas e listagens sem limite. Também melhorou a apresentação do carregamento na lista de clientes.

Os resultados mais relevantes foram:

- **Salvamento de dieta com 30 alimentos:** preferências passaram de 30 escritas por alimento para uma escrita em lote. No ensaio local do serviço, a mediana caiu de **54,97 para 32,70 ms**.
- **Demonstrações de 30 exercícios próprios:** consultas do alvo passaram de 30 para uma; mediana de **18,12 para 2,64 ms**.
- **Importação de modelo de treino com 30 exercícios próprios:** consultas do alvo passaram de 60 para duas; mediana de **44,56 para 15,53 ms**.
- **Alertas para 100 clientes:** leituras do tracking passaram de 200 para duas; mediana de **189,02 para 43,32 ms**.
- **Caminho real API–banco:** após a mudança de Oregon para Virgínia, a mediana da consulta constante aquecida caiu de **177,81 para 116,13 ms**, redução de **34,69%**.
- **JavaScript inicial:** quatro cenários sem gráfico visível na abertura passaram a carregar aproximadamente **31% menos JavaScript gzip**.
- **Imagens da marca:** os cenários medidos passaram de **248.272 bytes** para **799 a 5.312 bytes**, redução de **97,86% a 99,68%**.
- **Catálogo da nova dieta:** a abertura e a troca de fonte passaram de duas chamadas para uma; o roteiro completo caiu de **oito para cinco chamadas**, redução de **37,5%**.
- **Listas de clientes e exames:** respostas padrão passaram de 600 para 25 registros no fixture; os corpos JSON ficaram aproximadamente **96% menores**. A navegação foi validada com **1.105 clientes e 1.105 exames**.

**Não existe um percentual único comprovado de “quanto o sistema inteiro ficou mais rápido”.** Essas medidas têm bases diferentes: tempo de serviço, ida e volta de SQL, bytes de imagens, JavaScript e JSON, além de contagem de chamadas. Somá-las ou multiplicá-las produziria uma conclusão sem suporte nos testes.

As entregas adicionais de 21/11 ampliam esse resultado:

- **Atualização das centrais de retorno:** consultas de agenda passaram de seis para três por atualização manual.
- **Páginas públicas:** o conteúdo passou a existir no HTML inicial, com forte queda de LCP no ensaio local com latência fixa de autenticação simulada.
- **Consultas enxutas:** a listagem de clientes passou de 26 para 10 colunas; fixtures de receitas e planos também registram redução de JSON.
- **Observabilidade de API/SQL e RUM:** foram adicionados tempos por etapa, correlação, percentis e coleta Web Vitals com painel administrativo. Instrumentar não equivale a provar aceleração; cria meios para medir e diagnosticar.

Também houve resultados sem melhora: o LCP do item 22 não mostrou ganho consistente; a paginação de exames não reduziu sua mediana HTTP local; pedidos ficaram alguns milissegundos mais lentos ao incluir contagem global exata. A etapa posterior de renderização pública tem outro cenário de LCP e outro método, que não deve ser confundido com aquele primeiro ensaio.

## 2. O que foi entregue e o alcance de cada etapa

| Item | Entrega efetiva | Camada principal | Resultado e alcance |
|---|---|---|---|
| 01 | Skeleton na listagem de clientes | Frontend | Melhora o estado de espera; não há ganho numérico comprovado no tempo da API |
| 08 | Operações em lote em preferências alimentares, referências de exercícios e tracking | Backend e consultas SQL | Redução de comandos e das quatro medianas locais medidas |
| 19 | API transferida de Oregon para Virgínia, com banco em São Paulo | Infraestrutura e rede | Redução medida no caminho API–banco e troca de tráfego validada em produção na ocasião |
| 22 | Gráficos e diálogos condicionais sob demanda | Frontend e bundle | Menos JavaScript antes da necessidade em quatro cenários; gráficos inicialmente visíveis preservados |
| 02 | Imagens responsivas da logomarca com Next/Image | Frontend e assets | Menos bytes nos 12 cenários medidos, com dimensões e transparência preservadas |
| 03 | Remoção de buscas duplicadas do catálogo da nova dieta | Frontend e HTTP | Uma chamada por necessidade, com debounce e proteção contra resposta antiga |
| 05 | Paginação de clientes, exames e pedidos | Backend, frontend e consultas SQL | Respostas limitadas, filtros globais e navegação íntegra no volume testado |
| 16 | Paralelização e remoção de refetch duplicado | Frontend | Leituras/invalidações independentes simultâneas; agenda 6 → 3 consultas |
| 18 | Instrumentação de duração e correlação | API e driver SQL | Etapas, identificadores, logs redigidos e percentis; sem ganho de latência quantificado |
| 20 | Conteúdo público no HTML inicial | Frontend e SSR | Remove dependência da verificação de sessão para pintar páginas públicas |
| 24 | Projeções mínimas com `select` | Backend e contratos frontend | Menos campos/joins; economia calculada em fixtures, sem EXPLAIN novo |
| 30 | Coleta de Web Vitals e painel administrativo | Frontend e API | Pipeline RUM validado localmente; sem comprovação de coleta contínua de produção |
| 14 | Atualização otimista | Fora do resumo | Tentativa local descartada; implementação remota independente preservada, sem contabilizar ganhos |

A numeração segue os itens da auditoria, não a ordem cronológica. “Entregue na branch” e “implantado em produção” são estados diferentes; a seção de estado de publicação explica essa distinção.

## 3. Como o sistema está organizado

O frontend usa **Next.js 16, App Router, React 19 e TypeScript**. A camada de dados utiliza hooks e **TanStack Query**, além do cliente HTTP compartilhado. Os ensaios de bundle e imagens registram a versão instalada Next.js **16.3.8**.

As chamadas do navegador usam o caminho `/api`, com proxy no frontend hospedado na **Vercel**, para uma API **NestJS** hospedada no **Render**. O backend utiliza **Prisma** para acessar **PostgreSQL/Supabase**, preservando autenticação, papéis de acesso, propriedade dos prontuários e RLS.

Na migração regional registrada em 17/11, o banco permaneceu em **São Paulo (`sa-east-1`)**. A API ativa passou para **Virgínia**, e Oregon ficou como reserva. Render não oferece uma região brasileira nesse arranjo; portanto, a mudança reduziu a distância de rede sem colocar API e banco na mesma região.

| Aspecto | Informação registrada |
|---|---|
| PostgreSQL dos benchmarks locais de lote | 16.15, em Docker descartável |
| Prisma do benchmark de lote | 7.10.0 |
| Node do benchmark de lote | 24.19.0 |
| PostgreSQL de produção registrado na mudança regional | 17.6.1.084, Supabase São Paulo |
| Frontend de produção preservado na mudança regional | Commit `69fd921`; reconstruído para mudar o upstream |
| API ativa registrada após conciliação | Commit `d92a628`, incluindo as correções em lote |

Essas diferenças de ambiente são relevantes: tempo obtido em PostgreSQL local não deve ser apresentado como tempo esperado de uma tela real em produção.

## 4. Item 01 — skeleton na lista de clientes

### Problema e alteração

A lista usava um indicador genérico durante a consulta. Foi criado `ClientListSkeleton`, que representa a estrutura da lista antes de os dados chegarem: tabela no desktop e cartões no celular.

O componente tem **cinco linhas/cartões de exemplo**, descrição para leitores de tela, `role="status"`, `aria-busy` e aviso acessível. Os elementos decorativos ficam ocultos da árvore de acessibilidade e a animação respeita a preferência de movimento reduzido.

Foram adicionados testes para três transições: resposta com clientes, lista vazia e erro da consulta. O estado de espera é substituído pelo resultado correspondente.

### O que podemos afirmar

Essa entrega melhora o entendimento visual de que a lista está carregando. **Não altera consultas SQL, número de chamadas ou tempo de salvamento.** Não existe medição versionada que comprove redução de tempo de carregamento por causa desse skeleton.

O escopo comprovado é a **listagem de clientes**; não foi uma padronização de skeletons em todas as telas do sistema.

**Commit:** `c076882`. Arquivos centrais: `ClientListSkeleton.tsx`, `web/app/clientes/page.tsx` e o teste da página.


## 5. Item 08 — eliminar consultas e escritas por item

### Por que isso pesava

Quando uma operação faz uma consulta ou escrita por alimento, exercício ou cliente, o número de viagens ao banco cresce junto com a coleção. Mesmo uma consulta individual rápida pode gerar um fluxo lento quando repetida muitas vezes.

Foram tratadas quatro operações específicas. A implementação troca o acesso por item por consultas/escritas em lote, mantendo as regras de validação e as transações existentes.

### Comparativo dos fluxos completos medidos

“SQL do alvo” conta os comandos das tabelas relacionadas ao problema. “SQL total” inclui também contexto, transações, locks e demais comandos necessários ao fluxo.


| Operação sintética | SQL do alvo antes → depois | SQL total antes → depois | Mediana antes → depois | Redução do tempo |
| --- | --- | --- | --- | --- |
| Salvar dieta: seis refeições e 30 alimentos com preferência | 30 → 1 | 58 → 29 | 54,97 → 32,70 ms | 40,51% |
| Resolver demonstrações de 30 exercícios próprios | 30 → 1 | 34 → 5 | 18,12 → 2,64 ms | 85,41% |
| Importar modelo com 30 exercícios próprios para rascunho | 60 → 2 | 71 → 13 | 44,56 → 15,53 ms | 65,15% |
| Gerar alertas: 100 clientes e 8.475 registros de tracking | 200 → 2 | 206 → 8 | 189,02 → 43,32 ms | 77,08% |

### O que mudou em cada operação

**Preferências de alimentos.** O serviço de dietas reúne as preferências elegíveis e executa um upsert em lote, em vez de uma escrita por alimento. Quando a mesma combinação alimento/quantidade aparece mais de uma vez, prevalece a última medida, como no comportamento anterior. IDs existentes, quantidades sem arredondamento, lock do cliente e transação foram preservados.

**Demonstrações de exercícios.** Referências a exercícios próprios são reunidas e consultadas por profissional em lote. A construção dos resultados continua respeitando a ordem dos exercícios, a ordem dos erros, os snapshots e as validações de acesso. O lookup dos modelos e sua importação passaram a usar o mesmo princípio.

**Alertas.** O tracking é lido por lotes de até **500 pares exatos de profissional/cliente**. Uma consulta obtém a última atividade até o instante de corte; a outra traz o período recente necessário à contagem de sobrecarga. Para os 100 clientes do teste, isso representa duas leituras em vez de 200. Com mais de 500 pares, há novos lotes; não se afirma que existirão somente duas consultas para qualquer volume.

As regras de inatividade/abandono/sobrecarga, exclusão de registros futuros, dias UTC, advisory lock e substituição atômica dos alertas permaneceram. Para zero clientes, não há leitura de tracking.

### Método e comprovação de equivalência

O benchmark usa PostgreSQL local, com **dois aquecimentos e sete repetições** por operação. Seed, limpeza, validação do resultado e EXPLAIN ficam fora do intervalo medido. As rodadas pareadas arquivadas foram executadas sequencialmente, sem builds/testes concorrentes.

As operações clínicas usam o papel clínico e o job usa o papel jobs, ambos sem superusuário, sem BYPASSRLS e sem propriedade das tabelas. O administrador prepara e confere apenas o fixture sintético.

Os hashes dos resultados de preferências, demonstrações e alertas são iguais nas duas versões. O fixture de alertas testa também registros futuros, modalidades distintas e pares incorretos de profissional/cliente.

**O que o tempo representa:** execução do serviço e sua transação local. Não inclui navegador, HTTP, autenticação JWT, latência do Render ou uma sessão real de produção.

### Planos SQL e limite remanescente

Foram guardados os SQLs e seus planos `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. O agregado novo de última atividade retorna 75 resultados para o lote e examina **8.175 linhas** antes de agrupar. A consulta de tracking recente retorna 525 linhas no cenário.

Uma consulta agregada que cobre 100 pares pode demorar mais que uma consulta antiga de um único cliente; isso não invalida o ganho do fluxo completo, que caiu de 189,02 para 43,32 ms. O benefício vem de reduzir comandos e viagens, sem garantir que todo comando isolado ficou mais curto.

Os loops de busca/criação de alimentos na cópia/importação de modelos alimentares continuam como melhoria futura. Eles podem reutilizar um alimento criado numa iteração anterior; convertê-los em lote exige definir e testar essa escolha. **Não foi eliminado todo acesso a banco dentro de loops do projeto.**

**Commits funcionais:** `05ed778`, `9b7c506` e `8555e5f`.


Fontes: [relatório do item 08](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-08-verification.md); [amostras antes](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-08/before.json); [amostras depois](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-08/after.json).

## 6. Item 19 — aproximar a API do banco

### Topologia anterior e posterior

| Etapa | Caminho registrado |
|---|---|
| Antes | Navegador → Vercel → API Render Oregon → Supabase São Paulo |
| Depois | Navegador → Vercel → API Render Virgínia → o mesmo Supabase São Paulo |

A mudança foi da **hospedagem da API**, sem mover ou copiar o banco. Uma API reserva permaneceu em Oregon para rollback.

### Números obtidos nos próprios servidores


| Métrica | Oregon → banco | Virgínia → banco | Diferença |
| --- | --- | --- | --- |
| Mediana da consulta constante aquecida | 177,81 ms | 116,13 ms | −61,68 ms / −34,69% |
| p95 da consulta constante | 178,64 ms | 116,68 ms | −61,96 ms |
| Abertura da conexão, uma amostra por região | 1188,43 ms | 812,98 ms | −375,45 ms |

A coleta fez **três aquecimentos e 15 amostras por região**, com `SELECT 1 AS region_probe`, em transação `READ ONLY`, usando conexão clínica restrita. Terminou com rollback e fechamento da conexão, sem ler prontuários nem gravar dados.

O tempo inclui rede, pooler, protocolo, driver e execução constante. **Não é ping/RTT ICMP, tempo de consulta clínica, tempo de carregamento de tela ou tempo de salvamento.** Com 15 amostras, o p95 registrado corresponde ao máximo observado. A abertura de conexão tem somente uma amostra por região.

Uma coleta preliminar em sondas separadas encontrou 178,23 → 114,36 ms. Ela não foi misturada à comparação final dos servidores reais: o número de referência desta entrega é **177,81 → 116,13 ms**.

### Publicação, segurança e agendamento

A troca de tráfego foi validada em produção em **17/11/2026, horário de Fortaleza**. O domínio principal respondeu 200, a rota CSRF retornou 200 e o cabeçalho de região indicou Virgínia. Rotas de sessão/clientes sem autenticação continuaram retornando 401.

A transferência deixou **um agendador ativo na Virgínia e zero em Oregon**, sem sobreposição. Houve um breve intervalo sem agendador durante a passagem. As sondas foram retiradas do startup para não acrescentar consultas a cada inicialização.

Durante a publicação, a conferência de paridade detectou que um candidato de API não incluía módulos recentes de `main`. O tráfego foi revertido, a configuração original foi restaurada, a branch foi conciliada e os testes foram repetidos antes da promoção corrigida. Não há medição de sessões reais naquele intervalo; não se afirma ausência de impacto a usuários conectados.

Não foram alterados schema, migrations, RLS, grants, autenticação ou dados clínicos de produção. As conexões e os segredos foram reaproveitados por referências internas, sem registrá-los no relatório.

### Custos e limites operacionais registrados

- As APIs ativa e reserva permaneceram no plano **Free**, sem criação de compute pago nessa entrega.
- A cota Free de **750 horas por workspace/mês** é compartilhada. Duas APIs sempre acordadas podem excedê-la; a reserva não deve receber tráfego artificial para se manter desperta.
- O plano Free mantém cold starts por inatividade. Essa entrega **não comprova redução de cold start** nem elimina esse comportamento.
- Saldo de cotas, egress e eventual custo excedente não foram medidos.
- A mudança reduziu a latência internacional, mas a API continua nos EUA e o banco no Brasil.

O estado acima é o observado na entrega, não uma nova consulta aos painéis em 26/11. O rollback regional envolve tráfego, configuração e ordem de ativação dos agendadores; reverter um commit isolado não reverte infraestrutura.


Fontes: [relatório regional, ocorrência e rollback](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-19-regional-migration.md); [medição final nos servidores](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-19/migration-result.json).

## 7. Item 22 — carregar gráficos e componentes pesados sob demanda

### Mudança e preservação do conteúdo principal

Gráficos e diálogos condicionais passaram a usar `next/dynamic`. Recharts deixou de ser necessário antes de abrir certas visualizações. Cabeçalhos, filtros, listas e consultas de dados continuam imediatos.

Os gráficos que já eram visíveis por padrão **continuam automáticos após a chegada dos dados**. Não foi introduzida espera por clique ou scroll nesses casos. Durante o download do componente, placeholders reservam os espaços de 300/400 px previstos para os gráficos.

### JavaScript solicitado antes das interações

Valores em KiB de gzip, calculados por arquivo solicitado. **1 KiB = 1.024 bytes.**


| Cenário | Antes | Depois | Variação de bytes | Requisições JS |
| --- | --- | --- | --- | --- |
| Ficha Nutrição: gráfico visível | 357,8 KiB | 353,8 KiB | −1,12% | 18 → 19 |
| Ficha Personal | 357,8 KiB | 248,1 KiB | −30,65% | 18 → 16 |
| Exames do cliente: gráfico visível | 330,5 KiB | 333,0 KiB | +0,75% | 16 → 18 |
| Exames do cliente: histórico vazio | 330,5 KiB | 227,4 KiB | −31,19% | 16 → 15 |
| Central de exames: lista inicial | 345,2 KiB | 236,6 KiB | −31,46% | 17 → 16 |
| Evolução Nutrição: sem cliente selecionado | 349,3 KiB | 237,9 KiB | −31,88% | 18 → 15 |
| Evolução Personal: primeiro gráfico automático | 349,3 KiB | 349,6 KiB | +0,09% | 18 → 18 |

Nos quatro cenários sem necessidade inicial de Recharts, a redução foi de **30,65% a 31,88%**. Quando o gráfico é necessário, a biblioteca continua sendo baixada; o custo é adiado, não eliminado.

Na central, uma verificação adicional encontrou **242.294 → 352.916 bytes gzip acumulados** depois de abrir o comparativo: os **110.622 bytes** adicionais chegaram após a ação. Na evolução de Nutrição, selecionar o cliente levou o acumulado de **243.630 para 353.822 bytes**. Os SVGs apareceram normalmente.

Os pequenos aumentos também foram mantidos no registro: aproximadamente **2,5 KiB** no histórico de exames com gráfico e **315 bytes** na evolução Personal. A divisão traz economia nos cenários sem gráfico, com um custo pequeno quando ele já é exibido.

### Método e LCP

O ensaio usou Chromium em **390×844**, CPU com fator 4, RTT simulado de 150 ms, download de 1,6 Mbps e upload de 0,75 Mbps. Foram sete cenários, três contextos novos por cenário em cada versão: **21 capturas antes e 21 depois**. As APIs foram interceptadas com dados sintéticos; cache e prefetch foram controlados.

O LCP, que indica quando o maior elemento de conteúdo é pintado, foi coletado como diagnóstico:


| Cenário | LCP local antes | LCP local depois |
| --- | --- | --- |
| Ficha Nutrição: gráfico visível | 3.664 ms | 3.860 ms |
| Ficha Personal | 3.708 ms | 3.412 ms |
| Exames do cliente: gráfico visível | 3.252 ms | 3.012 ms |
| Exames do cliente: histórico vazio | 3.172 ms | 3.376 ms |
| Central de exames: lista inicial | 3.416 ms | 3.668 ms |
| Evolução Nutrição: sem cliente selecionado | 1.472 ms | 1.768 ms |
| Evolução Personal: primeiro gráfico automático | 3.776 ms | 3.004 ms |

**Nesta etapa 22 não houve melhora consistente de LCP.** São três amostras por cenário em ambiente local, com API simulada e CPU compartilhada. Esses números não demonstram ganho nem regressão causal de LCP em produção e não são notas do Lighthouse.

O resultado aceito é a redução de JavaScript antes da necessidade, junto com o carregamento progressivo funcional. Os gráficos de relatórios e uma separação completa de todos os workspaces por papel ficaram fora desse escopo.

**Commit funcional:** `5f1aad2`. Nenhuma biblioteca foi substituída.


Fontes: [relatório do item 22](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-22-progressive-loading.md); [comparativo de chunks e LCP](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-22/comparison.json); [verificação do carregamento adiado](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-22/deferred-verification.json).

## 8. Item 02 — imagens responsivas em AVIF/WebP

### O problema e a configuração adotada

A logomarca original tinha **512×512 px e 248.272 bytes**, mas aparecia em tamanhos de **20, 24, 32 ou 36 px CSS**. A configuração `images.unoptimized: true` impedia o Next/Image de gerar variantes adequadas.

A implementação passou a preferir **AVIF**, com **WebP** e **PNG redimensionado** como alternativas conforme o navegador. `sizes` e as larguras configuradas passaram a corresponder às densidades 1×, 2× e 3×. Por exemplo, uma marca de 36 px CSS pode receber variantes de 36, 72 ou 108 px, em vez de sempre carregar 512 px.

A qualidade final ficou em **85**, após comparação com qualidade 75. O PNG fonte foi preservado. O otimizador aceita somente `/logo.png`, sem query string; não foram liberados domínios remotos, SVGs ou acesso a endereços locais.

### Bytes de imagens realmente solicitadas

O valor anterior foi **248.272 bytes em todos os cenários**. A tabela conta o corpo das imagens solicitadas antes do scroll, incluindo variantes extras quando ocorreram.


| Tela | Viewport/densidade | Antes, bytes | Depois, bytes | Redução | Requests de imagem |
| --- | --- | --- | --- | --- | --- |
| Inicial | Desktop 1× | 248.272 | 1.763 | 99,29% | 1 → 2 |
| Login | Desktop 1× | 248.272 | 1.164 | 99,53% | 1 → 1 |
| Cadastro | Desktop 1× | 248.272 | 799 | 99,68% | 1 → 1 |
| Clientes/sidebar ou menu | Desktop 1× | 248.272 | 1.164 | 99,53% | 1 → 1 |
| Inicial | Desktop 2× | 248.272 | 3.088 | 98,76% | 1 → 2 |
| Login | Desktop 2× | 248.272 | 2.092 | 99,16% | 1 → 1 |
| Cadastro | Desktop 2× | 248.272 | 1.404 | 99,43% | 1 → 1 |
| Clientes/sidebar ou menu | Desktop 2× | 248.272 | 2.092 | 99,16% | 1 → 1 |
| Inicial | Celular 3× | 248.272 | 2.952 | 98,81% | 1 → 1 |
| Login | Celular 3× | 248.272 | 5.312 | 97,86% | 1 → 2 |
| Cadastro | Celular 3× | 248.272 | 2.092 | 99,16% | 1 → 1 |
| Clientes/sidebar ou menu | Celular 3× | 248.272 | 3.220 | 98,70% | 1 → 1 |

A redução ficou entre **97,86% e 99,68%**. Em alguns casos houve duas variantes pequenas em lugar de uma imagem grande; a contagem de requests aumentou, mas os bytes caíram fortemente. Isso mostra por que “menos requests” e “menos bytes” devem ser analisados separadamente.

### Qualidade e estabilidade visual

- Foram feitas **12 capturas antes e 12 depois**, em desktop 1440×900/DPR1 e DPR2 e celular 390×844/DPR3.
- Os tamanhos CSS foram preservados, e as larguras físicas dos logos visíveis corresponderam a CSS × DPR.
- A transparência permaneceu. AVIF/WebP foram conferidos, assim como o fallback PNG.
- O CLS observado ficou **0 → 0** nos 12 cenários. Isso representa preservação da estabilidade, não uma redução de um problema de CLS previamente medido.
- Foram comparados nove pares de recortes. A configuração 85 melhorou a diferença de pixels em relação à configuração 75; o ensaio registra PSNR entre 24,23 e 28,91 dB. Há compressão com perdas e diferenças de reamostragem, sem promessa de identidade pixel a pixel.
- O artefato standalone foi executado isoladamente; a transformação de imagem não dependeu da árvore de desenvolvimento do repositório.

O escopo foi a **marca nas sete ocorrências de Next/Image**. Não foi feita uma conversão geral de todas as imagens do sistema. Ícones, ilustrações de exercícios e mídias com regras próprias foram preservados.

A primeira transformação tem custo de CPU e as próximas podem usar cache. A otimização também pode consumir cota da plataforma; saldo/cobrança não foram medidos. Os números apresentados são de bytes de imagens, não de tempo total de tela, API ou salvamento.

**Commit funcional:** `dc27372`. Nenhuma dependência nova foi adicionada.


Fontes: [relatório de imagens](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-02-images.md); [comparativo de bytes e pixels](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-02/comparison.json); [validação do standalone](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-02/standalone-optimizer.json).

## 9. Item 03 — remover chamadas duplicadas no catálogo da nova dieta

### Causa e correção

Dois efeitos consultavam o catálogo quando a busca estava vazia: um imediatamente e outro 500 ms depois. A abertura do editor e a troca de fonte podiam disparar a mesma necessidade duas vezes. Uma resposta antiga também podia substituir uma fonte escolhida mais recentemente.

O carregamento passou a ter **um único efeito responsável pela consulta**. A busca textual manteve debounce de **500 ms** e mínimo de **dois caracteres**. A abertura sem texto é agendada sem a espera fixa de 500 ms.

O cleanup remove o timer e cancela a requisição anterior com `AbortController`; respostas obsoletas deixam de substituir a lista atual. O Strict Mode permaneceu habilitado.

### Contagem por necessidade

Os mesmos resultados foram observados no build de produção local e no modo de desenvolvimento.


| Ação do roteiro | Antes | Depois |
| --- | --- | --- |
| Abrir editor autorizado com busca vazia | 2 | 1 |
| Trocar fonte vazia para TACO | 2 | 1 |
| Digitar rapidamente `ar` → `arroz` | 1 | 1 |
| Limpar a busca | 1 | 1 |
| Trocar fonte vazia para TODAS | 2 | 1 |
| Fechar/reabrir sem alterar filtros | 0 | 0 |
| Adicionar alimento e finalizar: novos GETs do catálogo | 0 | 0 |
| Total de GETs do catálogo | 8 | 5 |

A redução é de **50% nas necessidades duplicadas** e de **37,5% no roteiro completo**. A contagem considera apenas `GET /foods` e `GET /foods/search`, sem incluir consultas de cliente, preferências ou o POST de salvamento.

O teste de montagem com editor já autorizado e Strict Mode repetindo os efeitos encontrou **3 → 1 chamadas**. É um cenário de teste diferente da navegação completa de browser, que encontrou 2 → 1; os números não foram misturados.

Os cinco testes de regressão cobrem carregamento inicial, Strict Mode, troca de fonte, debounce/limpeza e resposta antiga fora de ordem. No baseline, quatro falharam e o caso de debounce já passava; depois da correção, os cinco passaram.

Um roteiro adicional editou/excluiu/cadastrou alimento manual, adicionou-o à refeição e salvou uma prescrição sintética. Houve só um GET inicial de catálogo durante esse fluxo; o cliente e o alimento enviados ao salvamento foram conferidos. **Essa persistência foi simulada no interceptador, não em banco clínico de produção.**

Não há medição de milissegundos economizados na API/banco, LCP ou Lighthouse por esta mudança. Cancelar a requisição no navegador também não garante interromper um SQL que já começou no servidor.

**Commit funcional:** `d208c02`.


Fontes: [relatório do catálogo](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-03-food-catalogue.md); [contagens nos dois modos](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-03/comparison.json); [fluxo de edição e salvamento sintético](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-03/food-editing.json).

## 10. Item 05 — paginação de clientes, exames e pedidos

### Alteração ponta a ponta

As listagens principais passaram a buscar páginas de **25 registros por padrão**, com **máximo de 100**. A paginação foi aplicada nos serviços/endpoints e nas telas, com navegação anterior/próxima, contagens e ordenação determinística com desempate por ID.

Os filtros de busca, status e categoria são aplicados sobre a base autorizada inteira, antes do limite. A busca não se restringe aos itens da primeira página.

| Recurso | Tratamento implementado |
|---|---|
| Clientes | `page`, `pageSize`, status e busca; resposta em array com cabeçalhos de paginação |
| Laudos/exames da central | Envelope com `items`, paginação, indicadores globais e nomes de marcadores |
| Histórico por cliente | Páginas limitadas, com data/ID em ordem ascendente |
| Pedidos de exames | Array paginado, com emissão/ID descendentes |
| Comparativo longitudinal | Endpoint de pontos leves por marcador, carregado sob demanda |

### Comparativo medido com 600 clientes, 600 laudos, 1.200 marcadores e 60 pedidos

A tabela mede HTTP local, com dados sintéticos e RLS real. Os bytes são de JSON **descomprimido**; não equivalem a bytes Brotli/Gzip de transferência.


| Endpoint | Registros antes → depois | JSON antes → depois, bytes | Redução de JSON | Mediana HTTP antes → depois |
| --- | --- | --- | --- | --- |
| `/clients` | 600 → 25 | 865.794 → 36.076 | 95,83% | 46,81 → 21,61 ms |
| `/lab-exams` | 600 → 25 | 758.636 → 31.897 | 95,80% | 128,87 → 130,93 ms |
| `/lab-orders` | 60 → 25 | 26.761 → 11.151 | 58,33% | 11,37 → 15,44 ms |

**Clientes:** a mediana caiu **53,83%**, e o JSON da resposta ficou 95,83% menor.

**Exames:** o JSON caiu 95,80%, mas a mediana HTTP variou de 128,87 para 130,93 ms: **+2,06 ms, sem ganho de latência demonstrado**. A pequena diferença, em cinco amostras, não sustenta uma conclusão estatística sobre produção.

**Pedidos:** o JSON caiu 58,33%, mas a mediana aumentou **4,07 ms, aproximadamente 35,84%**. Nesse fixture pequeno, a contagem global exata acrescenta custo que supera a economia de serializar 35 registros a menos.

A entrega cumpre a limitação das respostas e a navegação em volume maior. **Não é correto apresentar a paginação como aceleração comprovada dos três endpoints.**

### Por que os dados completos não foram simplesmente cortados

Indicadores de exames continuam globais; não passaram a contar somente os 25 itens visíveis. Também foram preservados os nomes de marcadores personalizados fora da primeira página e a semântica dos filtros clínicos.

Os consumidores que precisam de todos os clientes ou de todo o histórico percorrem lotes de até **100**, com até **quatro requisições simultâneas**. Uma falha intermediária não vira uma coleção parcial apresentada como completa. HTTP 429 respeita `Retry-After` e permite cancelamento.

Por isso, a redução de 96% da resposta padrão de um endpoint **não significa que todos os bytes da tela caíram 96%**. A central ainda pode buscar clientes para seletores, e um gráfico completo precisa carregar seus pontos históricos.

Os números acima pertencem à entrega de paginação, anterior ao item 24. Este último passou a reduzir também as colunas de clientes e outras listagens. Seus fixtures são diferentes: **não comparar 36.076 bytes do item 05 com 7.333 bytes do item 24 como se fossem rodadas sucessivas do mesmo teste**, nem multiplicar os percentuais para inventar uma economia combinada.

Paginar o resultado também não significa que todo o trabalho SQL se limite a 25 linhas: contagens e agregados globais continuam examinando dados autorizados. O SELECT agregado de exames registrou **131,670 ms** no EXPLAIN local; é uma área para futura otimização.

### Volume, concorrência e testes funcionais

O teste adicional percorreu **1.105 clientes e 1.105 exames** em **12 páginas de 100**, sem IDs perdidos ou duplicados na base estática. As últimas páginas levaram **34,01 ms em clientes** e **188,71 ms em exames**, nesse ambiente local.

Isso valida o volume testado, não uma garantia de ausência de deslocamento de páginas quando outra sessão altera a coleção. O offset com desempate por ID não é um snapshot imutável entre requisições; cursor pode ser avaliado se o crescimento e as alterações simultâneas justificarem.

Também foram verificados: busca por nome fora da primeira página, caracteres `%`, `_`, barra e espaços, fronteiras de classificação clínica, filtros que correspondem a marcadores diferentes do mesmo laudo, propriedade entre profissionais, conta trocada, manutenção do foco ao digitar, exclusão na última página e rejeição de coleções parciais em falhas intermediárias.

O navegador validou desktop **1440×900** e celular **390×844**, incluindo navegação, arquivar/restaurar clientes, filtros combinados, pedidos e **600 pontos históricos** do gráfico. A sessão foi sintética; API local, PostgreSQL e RLS foram reais.

### Método e publicação

Foram feitos dois aquecimentos e cinco amostras por endpoint. O código anterior foi executado em snapshot isolado; as tabelas sintéticas receberam `ANALYZE` antes das rodadas para estabilizar estatísticas. Foram guardados planos de SELECTs equivalentes dos pais e do agregado real, incluindo avaliação com offset 1.100.

A mudança do envelope de laudos exige publicação coordenada: primeiro o frontend compatível com a API antiga, depois a API nova. O fallback aceita apenas os casos previstos de versão anterior, sem transformar erros de acesso em sucesso vazio.

**Commits funcionais:** `a4876f6`, `20760cf` e `31be0f8`. Benchmark/reprodução: `1e9ed67`. Relatório final: `defb43b`.


Fontes: [relatório completo de paginação e rollout](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-05-pagination.md); [HTTP antes](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-05/before-api.json); [HTTP depois](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-05/after-api.json); [volume e planos profundos](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-05/high-volume-api.json); [browser](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/evidence/performance-05/browser-after.json).

## 11. Item 16: paralelizar o que é independente

### O que mudou

Invalidações de caches independentes e leituras que não dependem uma da outra passaram a iniciar em paralelo com `Promise.all`. Os pontos alterados foram atualização de exames, criação de prontuário, carregamento inicial da reabilitação e atualização das centrais de retorno de Nutrição e Personal.

Nas centrais de retorno, havia também uma duplicação: primeiro eram refeitas consultas de agenda e depois uma invalidação disparava novas consultas dessas mesmas janelas. A operação passou a invalidar a raiz de agenda dentro do conjunto paralelo.

| Fluxo | Resultado registrado |
|---|---|
| Retornos — Nutrição | `GET /appointments` por atualização manual: **6 → 3** |
| Retornos — Personal | `GET /appointments` por atualização manual: **6 → 3** |
| Cadastro de cliente | Caches de clientes e workspace começam a invalidar simultaneamente; navegação espera os dois |
| Prescrição de reabilitação | Cliente e plano ativo iniciam leitura juntos; cleanup cancela ambas as leituras |
| Exames | Lista central e série clínica são invalidadas em paralelo; mensagem de sucesso espera ambas |

A economia de **50%** é na contagem de chamadas de agenda, não uma medição de redução de 50% no tempo total da tela. Não foi registrado benchmark de milissegundos dessa etapa.

A API foi mantida intacta. O relatório observa que as consultas clínicas compartilham uma conexão de transação para configurar RLS; `Promise.all` não cria paralelismo SQL real nessa única conexão. Autorizações e locks que precisam vir antes de uma escrita não foram paralelizados indevidamente.

As regressões usam barreiras de Promise para comprovar que a segunda operação começa antes da primeira terminar, em vez de presumir isso pelo código.

**Commit:** `63c1b8b`. Fonte: [relatório do item 16](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-16-parallel-requests.md).

## 12. Item 18: enxergar onde API e banco gastam tempo

### Instrumentação adicionada

O interceptor e o adapter do banco passaram a registrar duração total, fronteiras de execução e correlação entre requisição e SQL. Foram usados `X-Request-Id`, formato W3C `traceparent` e contexto por requisição com `AsyncLocalStorage`.

| Informação | Utilidade |
|---|---|
| Tempo total no interceptor | Identificar requisições lentas |
| Aquisição/início da transação | Distinguir espera por conexão do restante do trabalho |
| Configuração do contexto RLS | Acompanhar o custo de aplicar o isolamento |
| Controller/service | Verificar a duração da execução da aplicação |
| Validação da saída | Identificar custo da verificação de ownership da resposta |
| Queries e commit/rollback | Correlacionar duração SQL, quantidade e fechamento da transação |
| p50, p95, p99 e rotas mais lentas | Acompanhar distribuição das durações, além da média |

O `Server-Timing` é emitido nas rotas clínicas autenticadas, com tratamento específico para não expor esse detalhamento em login, health ou observabilidade. O endpoint de consulta dos agregados é `GET /observability/performance`, exclusivo de `ADMIN` e com `no-store`.

### Privacidade, limites e significado do resultado

A instrumentação extrai a operação e o alvo técnico da consulta; não registra os argumentos nem o SQL bruto. Rotas são normalizadas, e logs passam por redação defensiva para remover identificadores clínicos, segredos e strings sensíveis.

Os agregados usam memória limitada: **256 amostras por rota, até 200 rotas**, com tratamento de rotas fora do limite. São agregados da instância/processo, não um histórico distribuído durável.

Não foi instalado um SDK OpenTelemetry nem validada exportação OTLP nessa etapa. O formato de correlação e os logs deixam um caminho para integração futura.

**Esse item adiciona capacidade de medir; não traz percentual comprovado de aceleração.** Não há benchmark de overhead da instrumentação nem série de p95 de produção demonstrando melhora. As suítes de PostgreSQL real não foram repetidas no ambiente usado pelo relatório.

**Commit:** `e912854`. Fonte: [relatório do item 18](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-18-observability.md).

## 13. Item 20: páginas públicas com conteúdo no primeiro HTML

### Causa e comportamento corrigido

O `AuthProvider` escondia inclusive páginas públicas atrás da verificação inicial de sessão. O primeiro HTML continha a tela de carregamento, enquanto headings e formulários só apareciam depois das chamadas de autenticação/recuperação.

As rotas públicas `/`, `/auth/login` e `/auth/register` passaram a exibir conteúdo no HTML inicial. A detecção de sessão continua em segundo plano. As áreas protegidas continuam bloqueadas enquanto a sessão não está resolvida.

| Rota | HTML antes → depois | Resultado no conteúdo inicial |
|---|---|---|
| `/` | 28.198 → 39.420 bytes | Passa a incluir heading, navegação, links e conteúdo público |
| `/auth/login` | 18.060 → 26.401 bytes | Passa a incluir formulário, e-mail, senha e botão de entrar |
| `/auth/register` | 18.066 → 28.230 bytes | Passa a incluir formulário e seleção de papel profissional |
| `/home` | 17.569 → 17.703 bytes | Continua com barreira inicial, sem conteúdo protegido |
| `/clientes` | 17.576 → 17.710 bytes | Continua com barreira inicial, sem conteúdo protegido |

O HTML fica maior nas páginas públicas porque passa a conter o conteúdo real. Nesse caso, reduzir a dependência do caminho de autenticação é o objetivo; a economia não está em diminuir bytes de HTML.

### Medições locais registradas

Chrome headless, viewport **390×844**, cache desabilitado, três execuções por rota. As chamadas de autenticação foram simuladas com **250 ms por requisição**. O servidor Next de produção local usado nesse relatório era **16.3.4**.

| Rota | FCP antes → depois | LCP antes → depois | Redução de LCP no ensaio | CLS máximo |
|---|---|---|---|---|
| `/` | 144 → 152 ms | **1.324 → 152 ms** | 88,52% | 0 → 0 |
| `/auth/login` | 80 → 148 ms | **1.248 → 148 ms** | 88,14% | 0 → 0 |
| `/auth/register` | 88 → 136 ms | **1.276 → 136 ms** | 89,34% | 0 → 0 |

O FCP não melhorou nesses registros. Antes, os primeiros pixels eram da barreira de loading; o conteúdo principal aparecia mais tarde. O resultado importante é a remoção da dependência de autenticação para a pintura do conteúdo público, sob o atraso simulado.

**Essas reduções de 88%–89% não são melhoria global do site nem medição de produção real.** O ensaio não é comparável ao LCP do item 22: outros cenários, outra versão instalada do Next e outro método de simulação.

### Sessão e proteção

Foram adicionados controles de geração/época da sessão e abort da hidratação para impedir que um 401 antigo de `/auth/me` ou um refresh obsoleto apague o CSRF de um login mais novo. O redirecionamento de usuário autenticado foi preservado; visitantes sem sessão continuam fora das rotas clínicas.

Nonce CSP, contrato de direção, estados de papel inválido e isolamento das áreas protegidas foram verificados. Houve mudanças no código de hidratação/autenticação do frontend, **sem dispensar autorização clínica**.

**Commit:** `75aac62`. Fonte: [relatório do item 20](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-20-public-rendering.md).

## 14. Item 24: buscar somente colunas e relações necessárias

### Contratos e carregamento sob demanda

Clientes, receitas e planos alimentares passaram a usar projeções explícitas `select` no Prisma. O frontend separa contratos resumidos de contratos completos, para que uma listagem não dependa de campos que devem ser buscados no detalhe.

| Recurso | Ajuste registrado |
|---|---|
| Clientes | Listagem de **26 → 10 colunas**; detalhe e mutações continuam com os campos completos necessários |
| Receitas | Listagem sem ingredientes/alimentos completos; edição e seleção na dieta buscam o detalhe quando necessário |
| Histórico de receita | Informações de Food reduzidas no histórico; versão corrente mantém os campos necessários ao uso |
| Planos alimentares | Listagem de **22 → 7 colunas escalares**, mais relações resumidas de cliente/usuário |
| Verificação interna de receitas em refeições | Busca apenas IDs para a checagem, em vez da árvore de relações completa |

A edição de receita possui carregamento, erro recuperável e bloqueio de salvar até o detalhe chegar. O picker de receitas busca os ingredientes antes de entregar a versão completa ao editor de dieta.

### Cálculo de payload registrado

Os números abaixo foram obtidos **aplicando seletores compilados reais a fixtures sintéticas e serializando JSON**. Não são tempos HTTP nem captura de resposta de um banco em execução.

| Payload avaliado | Antes | Depois | Redução aproximada |
|---|---|---|---|
| 25 clientes, campos clínicos nulos | 15.508 bytes | 7.333 bytes | 52,7% |
| 25 clientes, campos clínicos preenchidos | 28.958 bytes | 7.333 bytes | 74,7% |
| 25 receitas, cinco ingredientes por receita | 72.034 bytes | 12.824 bytes | 82,2% |
| Uma receita, cinco versões e cinco ingredientes por versão | 16.300 bytes | 7.185 bytes | 55,9% |
| 25 planos alimentares, notes nulo | 13.158 bytes | 6.783 bytes | 48,4% |
| 25 planos alimentares, notes preenchido | 15.633 bytes | 6.783 bytes | 56,6% |
| Checagem interna de dez IDs de receita | 27.604 bytes | 172 bytes | 99,4% |

Não houve `EXPLAIN ANALYZE` nem E2E novo contra PostgreSQL real nesse ambiente, pois o banco de teste não estava ativo. Os testes focados verificam os contratos e as projeções; a redução de custo SQL/latência em produção ainda precisa de medição.

Esta etapa responde a parte do custo de seletores identificado no item 05: reduz os campos transferidos, embora alguns consumidores ainda precisem percorrer a coleção inteira em lotes.

**Commit:** `84e4895`. Fonte: [relatório do item 24](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-24-minimal-selects.md).

## 15. Item 30: Web Vitals, ingestão e painel RUM

### O que foi instrumentado

Foi adicionado um reporter com `next/web-vitals` para **LCP, INP, CLS, FCP e TTFB**, com envio em lote à própria API. O cliente usa `keepalive` e `credentials: omit`; não envia cookies da sessão nessa ingestão.

Rotas são normalizadas no cliente e no servidor por allowlist, descartando IDs, query strings e fragmentos. O objetivo é acompanhar rota/dispositivo sem registrar paciente, prontuário ou sessão clínica.

| Componente | Função |
|---|---|
| Reporter no navegador | Coleta, deduplicação e envio em lote |
| `POST /observability/web-vitals` | Ingestão pública de métricas técnicas, HTTP 202, lote de 1 a 10 e limite de 30 requisições/minuto |
| Agregador | Janela de **256 amostras por bucket** de rota/dispositivo/métrica |
| `GET /observability/web-vitals` | Consulta autenticada exclusiva de `ADMIN` |
| Painel em `/home` para ADMIN | Percentis p50/p75/p95, proporção “Bom”, filtros e comparação de segmentos |

A nova rota pública é de telemetria técnica, não de dados clínicos. A leitura dos agregados exige administração autenticada. CSP, RLS e as permissões dos recursos clínicos não foram relaxadas.

### Verificação local registrada

Next **16.3.6** em modo de produção local, NestJS com controllers/validação/CSRF reais e Chrome headless:

- **10 de 10 POSTs** retornaram 202 e foram conferidos **sem Cookie**.
- Foram coletadas **16 amostras**, em três rotas públicas e cinco segmentos rota × dispositivo.
- O painel administrativo exibiu cinco linhas, sem erros de CSP ou exceções JavaScript registrados.

| Segmento do ensaio local | Eventos de todas as métricas | LCP p75 | FCP p75 | TTFB p75 |
|---|---|---|---|---|
| Desktop 1440×900 | 8 | 420 ms | 420 ms | 289,7 ms |
| Mobile emulado 390×844 | 8 | 128 ms | 128 ms | 25,5 ms |

As oito amostras de cada segmento são eventos do conjunto de métricas, não oito observações de cada indicador. Esses valores demonstram que o pipeline recebeu e agregou eventos. **Não mostram que um celular real é mais rápido que um desktop**, não são uma comparação antes/depois e não representam distribuição de usuários de produção.

O agregador é em memória por instância: reinícios e múltiplos processos afetam a continuidade da visão. Não há série persistente consolidada de longo prazo demonstrada nessa entrega. Coleta contínua de produção depende de publicação e confirmação do funcionamento conjunto do frontend e da API; o título “RUM em produção” do relatório descreve a finalidade, não comprova que essa série já exista em produção real.

**Instrumentação não é ganho de velocidade por si só.** Ela cria meios para acompanhar as melhorias futuras e detectar problemas com dados reais, depois de implantada e verificada.

**Commit:** `9cf2ad6`. Fonte: [relatório do item 30](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/runbooks/performance-30-rum-web-vitals.md).

## 16. O que foi validado em produção e o que ficou na branch

| Mudança | Estado documentado na ocasião | Limite da afirmação |
|---|---|---|
| Troca Oregon → Virgínia | Tráfego de produção transferido e validado em 17/11 | Não houve nova inspeção de produção para este resumo |
| API com batching/N+1 | A entrega regional registra API conciliada com `main` e correções em lote | As medianas de batching são do benchmark local, não de tráfego clínico real |
| Skeleton, gráficos sob demanda, imagens e catálogo | Código implementado e publicado na branch; etapas frontend posteriores não promoveram novo deployment de produção | “Build de produção local” significa modo otimizado executado localmente |
| Paginação | Código e evidências publicados na branch em 19/11 | A própria entrega registra ausência de deploy de API/frontend em produção |
| Paralelização, observabilidade, renderização pública, projeções e RUM | Código e relatórios adicionais publicados em 21/11 | Não foi confirmada implantação dessas versões em produção neste resumo |
| Item 14 | Fora do relatório por solicitação; tentativa local descartada | Existe implementação remota independente preservada; ela não foi revertida nem contabilizada |

As configurações de backend registradas na mudança regional tinham auto-deploy/autoSync desligados; seu estado atual não foi reconsultado. **Publicar commits na branch não atualiza automaticamente a API de produção.** A exceção de preview dessa branch também foi mantida como parte do rollback regional; deve ser conferida antes de usar um preview para homologar uma API nova.

Não foi realizado merge de toda essa sequência em `main` como parte dessas entregas. O merge `47ded82` incorporou `main` à branch de performance para preservar os módulos existentes, e não o contrário.

Se outro responsável realizou deploys posteriores, este documento não os confirma nem os invalida: ele registra as ações e evidências desta sequência.

## 17. Segurança e integridade preservadas

O desempenho foi tratado sem reduzir as verificações de acesso:

- RLS, guards e autorização clínica foram preservados. O item 20 ajusta o ciclo de sessão/hidratação do frontend e as proteções contra respostas antigas; isso não equivale a dispensar autenticação nas rotas protegidas.
- Queries em lote mantêm os filtros de profissional/cliente, e os alertas usam pares exatos.
- Locks, transações, rollback e snapshots necessários aos fluxos clínicos foram mantidos.
- Não foram criadas migrations ou índices de performance nessa sequência. A conciliação com `main` trouxe migrations já existentes, sem executá-las em produção por essa entrega.
- Bases locais receberam fixtures, schema já existente e estatísticas para testes; isso não equivale a alteração do banco de produção.
- O otimizador de imagens é restrito à marca pública, sem liberar arbitrariamente URLs.
- Os cabeçalhos de paginação/`Retry-After` ficaram disponíveis para origens já autorizadas; a lista de origens e as credenciais não foram afrouxadas.
- A troca de conta e as respostas atrasadas são cobertas por guardas e regressões para não exibir dados da sessão anterior.
- As entregas analisadas não antecipam confirmações clínicas sensíveis. A tentativa local do item 14 foi descartada; a implementação independente remota não foi avaliada por este resumo.
- Não foram registradas senhas, URLs privadas de conexão, tokens ou cookies neste resumo.

Essas são as garantias implementadas e testadas no escopo das mudanças; não equivalem a uma nova auditoria completa de segurança do projeto em 26/11.

## 18. Testes e verificações registrados

Os resultados abaixo são históricos de cada entrega. **Não somar as linhas:** grande parte dos testes foi reexecutada em revisões diferentes.

| Etapa | Unitários API | Integração PostgreSQL/HTTP/RLS | Frontend | Outras verificações |
|---|---|---|---|---|
| 01 — skeleton | Sem novo resultado numérico consolidado da etapa | Não se aplica à mudança de apresentação | Três transições adicionadas: dados, vazio e erro | Acessibilidade e movimento reduzido no componente |
| 08 — lotes | 801 em 60 suítes | 255 em 40 suítes | 751 em 95 arquivos | Builds, lint, tipos e 31/31 páginas no pós-build |
| 19 — região | 819 em 63 suítes | 256 em 41 suítes | 773 em 99 arquivos | Probes reais, saúde/401/CSRF, agendador e 32/32 páginas |
| 22 — carregamento sob demanda | Não reexecutados para essa mudança frontend | Não reexecutados | 773 em 99 arquivos | 21 capturas antes/depois, sete verificações adicionais e ações desktop/mobile |
| 02 — imagens | Não reexecutados para essa mudança frontend | Não reexecutados | 773 em 99 arquivos | 12 cenários antes/depois; 22 variantes, fallback e seis bloqueios do otimizador |
| 03 — catálogo | Não reexecutados para essa mudança frontend | Não reexecutados | 778 em 100 arquivos | Cinco regressões específicas, browser dev/produção local e CRUD sintético |
| 05 — paginação | 820 em 64 suítes | 265 em 42 suítes; benchmark/browser optativos executados separadamente | 787 em 103 arquivos, mais dois testes focados de compatibilidade | 1.105 registros; desktop/mobile; builds, lint, tipos e 32/32 páginas |

### Validações adicionais registradas em 21/11

Os relatórios adicionais têm **falhas conhecidas nas suítes completas**, embora os testes focados das alterações tenham passado. Elas não foram ocultadas nem consideradas aprovadas nesta consolidação.

| Etapa adicional | Focados registrados | Suíte completa registrada | Situação de integração |
|---|---|---|---|
| 16 — paralelização | Web 43/43, seis arquivos | Web **795/796**, 103/104 arquivos | Uma falha de fixture SHA-256 no Windows |
| 18 — observabilidade | API 32/32, seis suítes | API **840/841**, 68/69 suítes | Uma falha de regras de mídia no Windows; PostgreSQL não reexecutado |
| 20 — SSR público | Web 65/65, sete arquivos | Web **809/810**, 103/104 arquivos | Uma falha de fixture no Windows; sem novo E2E PostgreSQL |
| 24 — projeções | API 96/96; web 60/60 | API **843/844**, 68/69; web **811/812**, 103/104 | Duas suítes com falha Windows; sem novo PostgreSQL real |
| 30 — RUM | API 31/31; web 25/25 | API **849/850**, 69/70; web **820/821**, 106/107 | Falhas Windows registradas; verificação do pipeline RUM feita localmente |

Para os itens 16, 18, 20, 24 e 30, os números desta consolidação são os registrados nos relatórios versionados do outro agente e nos commits correspondentes. Não houve nova coleta ou reprocessamento independente dessas medições nesta tarefa; os resultados dos ensaios originais permanecem documentados como tais.

As falhas relatadas são `web/test/licensed-media-fixture.test.ts` (hash do SVG) e `api/src/modules/workouts/exercise-demonstration-probe.spec.ts` (regras de mídia). Os relatórios atribuem a causa à conversão **LF → CRLF com `core.autocrlf=true`** no checkout Windows. Essa explicação está documentada pelos autores das entregas; não foi reproduzida nem corrigida ao preparar este arquivo.

Typecheck, lint e builds são registrados como aprovados nas cinco etapas; os pós-builds frontend mantêm 32/32 páginas e standalone sem dependências de desenvolvimento/arquivos de ambiente. **Isso não transforma as suítes completas acima em integralmente aprovadas.**

Uma correção posterior de intercepts Cypress, `d72036b`, adaptou as leituras mockadas aos parâmetros de paginação e às consultas em segundo plano. O registro informa **3/3 specs e 7/7 testes** do recorte de CI e **7/7 specs e 17/17 testes** da suíte mockada completa, além de tipos/lint. São testes com interceptação, não validação de persistência em PostgreSQL real. Fonte: [status e verificações adicionais](https://github.com/Gustavo13Cs/ecossistema-resiliencia/blob/d72036b337fa6f5ff55a1f556b4d7e432f27891e/docs/agents/ANTIGRAVITY_STATUS.md).

Os 265 testes de PostgreSQL do item 05 referem-se à revisão daquela entrega; não validam automaticamente todas as mudanças posteriores de observabilidade/projeções. Os relatórios novos registram a ausência de um banco de teste ativo.

Os builds e as verificações de standalone conferiram que o artefato não dependia de pacotes de desenvolvimento nem carregava arquivos de ambiente indevidamente.

Houve falhas durante o trabalho que foram tratadas ou registradas: um teste precisou aguardar o import assíncrono; execuções concorrentes provocaram timeout; o runner PostgreSQL esgotou o heap padrão e foi repetido com 4 GB somente no processo local de teste; o benchmark de paginação foi isolado e passou a atualizar estatísticas do fixture. Os resultados finais citados são das rodadas aprovadas, sem misturar tentativas instáveis.

Na paginação, uma revisão independente identificou pontos de foco, caracteres especiais, troca de conta, CORS e limite de requisições. Os achados receberam correções e regressões; a sessão do revisor terminou por limite do serviço antes de um veredito formal, e a conferência final foi concluída pelo executor. Não se afirma aprovação formal integral dessa revisão.

**Nenhuma dessas suítes foi executada novamente apenas para escrever este resumo.** Nesta consolidação foram conferidos os relatórios, os JSONs e o histórico Git. A tentativa local do item 14 foi descartada sem remover as entregas remotas de outro autor.

## 19. O que os números significam — e o que não significam

| Medida | Permite concluir | Não permite concluir |
|---|---|---|
| SQL contado pelo driver no item 08 | Menos comandos no mesmo fluxo sintético e equivalência de resultado | Que toda consulta N+1 do projeto foi eliminada |
| Mediana do serviço local | Menos tempo no escopo medido, incluindo sua transação | Tempo de tela ou salvamento autenticado em produção |
| `SELECT 1` nos servidores reais | Menor custo do caminho API–banco naquele momento | Redução igual de 34,69% em todas as telas ou queries clínicas |
| JavaScript gzip solicitado | Menos código baixado antes da necessidade nas rotas medidas | Menor custo total de usar todos os gráficos ou ganho garantido de LCP |
| Bytes de imagens | Menor corpo de imagens nos viewports testados | Redução igual no peso total de toda a aplicação |
| GETs do catálogo | Menos chamadas redundantes no roteiro definido | Economia medida de SQL ou milissegundos de backend |
| JSON e registros por página | Respostas e listas visíveis limitadas | Que todo COUNT/agregado lê só 25 linhas ou que todos os endpoints ficaram mais rápidos |
| Testes aprovados | Contratos e regressões cobertos passaram na revisão indicada | Ausência absoluta de bugs ou validação atual de sessões reais de produção |

Continuam **não comprovados de ponta a ponta em produção**: carregamento autenticado de dashboards/agenda/prontuários, salvamento clínico completo, p95 HTTP representativo, taxa de erro sob carga, cold starts e uma série contínua representativa de usuários reais. Os itens 18 e 30 fornecem instrumentação para parte dessas medições, mas não uma série histórica de produção já validada. Não foi obtida nota de Lighthouse mobile nesta sequência. Há dois ensaios distintos de LCP local, cada um apresentado com seu método e limites.

## 20. Melhorias futuras sustentadas pelas evidências

Estas são recomendações, **não novas alterações executadas** neste resumo:

1. **Investigar os agregados de exames e a contagem de pedidos.** Separar o custo da página do custo dos indicadores, avaliar cache privado/invalidação e medir os planos sob o papel clínico. São os pontos que não demonstraram ganho de latência.
2. **Medir os seletores após o item 24.** `ClientSummary` já reduz 26 para 10 campos. Ainda pode ser necessário um endpoint de busca/opções que evite percorrer todos os clientes, em vez de apenas continuar reduzindo colunas.
3. **Validar a implantação e usar a instrumentação dos itens 18 e 30.** Confirmar coleta em ambiente autorizado, acompanhar LCP/INP e p95 por rota e papel e medir salvamentos clínicos. Definir retenção/exportação e avaliar overhead; não tratar as amostras locais como tráfego real de produção.
4. **Acompanhar cold starts e cotas do Render.** A aproximação regional não resolve o repouso do plano Free; qualquer alteração de plano deve ter custo e necessidade medidos.
5. **Revisar os loops restantes dos modelos alimentares.** Preservar a escolha do alimento e a dependência entre iterações antes de substituir a lógica por lote.
6. **Avaliar cursor com crescimento real e alterações simultâneas.** O offset foi validado em 1.105 registros estáticos; cursor pode ser necessário em volumes e frequências de mudança maiores.
7. **Medir gráficos de relatórios e outros componentes pesados.** Separá-los apenas se isso não adiar conteúdo principal e se os números justificarem a mudança.
8. **Ampliar auditoria de assets quando houver necessidade.** O ganho de imagens comprovado é da marca; não significa otimização automática de todo arquivo ou mídia externa.
9. **Fechar a validação das entregas mais recentes antes de promovê-las.** Reexecutar as suítes completas em ambiente configurado, incluindo PostgreSQL; confirmar a causa das falhas LF/CRLF sem simplesmente trocar hashes esperados ou desabilitar verificações de integridade.

O item 14 permanece fora deste resumo e não foi reinserido como recomendação. A implantação independente remota mencionada na abertura foi preservada, sem análise de seus ganhos aqui.

## 21. Histórico de commits e reversibilidade

| Etapa | Commits de referência |
|---|---|
| Skeleton de clientes | `c076882` |
| Preferências em lote | `05ed778` |
| Referências de exercícios/modelos em lote | `9b7c506` |
| Tracking/alertas em lote | `8555e5f` |
| Evidências dos lotes | `31451cf` |
| Preparação e mudança regional | `308192c`, `721016c`, `2c8f811`, `23176e8`, `5e384b2`, `47ded82`, `d92a628`, `4f1fc64` |
| Registro final da mudança regional | `ab9b735` |
| Gráficos e diálogos sob demanda | `5f1aad2`; evidência `d9d08ac` |
| Imagens responsivas | `dc27372`; evidência `6e83015` |
| Catálogo sem duplicações | `d208c02`; evidência `4a7d175` |
| Paginação | `a4876f6`, `20760cf`, `31be0f8`; benchmark `1e9ed67`; relatório `defb43b` |
| Paralelização | `63c1b8b`; relatório `81cf592` |
| Observabilidade API/SQL | `e912854`; relatório `58dc395` |
| Renderização pública | `75aac62`; relatório `a85e764` |
| Projeções mínimas | `84e4895`; relatório `3e33847` |
| Web Vitals/RUM | `9cf2ad6`; relatório `8d63763` |
| Ajuste dos testes Cypress à paginação | `d72036b` |

As mudanças de código têm commits identificados e os relatórios individuais descrevem rollback. Não há migration de performance para desfazer nessa sequência. Dois cuidados importam:

- A mudança regional exige restaurar tráfego/configuração e garantir um único agendador ativo; um revert de Git sozinho não faz isso.
- A paginação exige compatibilidade entre frontend e API por causa do envelope de laudos. O rollback de deploy deve respeitar o pareamento e a ordem descritos no runbook.

Os hyperlinks deste documento apontam para a revisão remota `d72036b`, para que as evidências continuem identificáveis mesmo se a branch avançar. O repositório pode exigir autenticação do leitor. Os caminhos abaixo também servem para consulta em um clone local.

## 22. Índice das evidências e reprodução

| Frente | Relatório local | Artefatos/scripts principais |
|---|---|---|
| 01 | Commit `c076882` | `web/components/features/clients/ClientListSkeleton.tsx` e testes da página |
| 08 | `docs/runbooks/performance-08-verification.md` | `evidence/performance-08/{before,after}.json`, planos `.json.gz`, `api/test/performance/nplus1.benchmark.ts` |
| 19 | `docs/runbooks/performance-19-regional-migration.md` | `evidence/performance-19/migration-result.json`, sondas e registros de retirada |
| 22 | `docs/runbooks/performance-22-progressive-loading.md` | `comparison.json`, `deferred-verification.json`, `measure-progressive-loading.py`, `verify-progressive-actions.py` |
| 02 | `docs/runbooks/performance-02-images.md` | `comparison.json`, recortes antes/depois, `standalone-optimizer.json`, scripts de imagens |
| 03 | `docs/runbooks/performance-03-food-catalogue.md` | `comparison.json`, arquivos de browser antes/depois, `food-editing.json`, scripts do catálogo |
| 05 | `docs/runbooks/performance-05-pagination.md` | `before-api.json`, `after-api.json`, `high-volume-api.json`, `browser-after.json`, adaptador do baseline e driver |
| 16 | `docs/runbooks/performance-16-parallel-requests.md` | Testes determinísticos de concorrência e contagem de requests |
| 18 | `docs/runbooks/performance-18-observability.md` | Instrumentação e testes em `api/src/common/observability/` |
| 20 | `docs/runbooks/performance-20-public-rendering.md` | Comparativos SSR/Chrome registrados no relatório e regressões de sessão |
| 24 | `docs/runbooks/performance-24-minimal-selects.md` | Tabela determinística de projeções e testes dos contratos |
| 30 | `docs/runbooks/performance-30-rum-web-vitals.md` | Pipeline/painel RUM e verificação local registrada |
| Cypress | `docs/agents/ANTIGRAVITY_STATUS.md` | Recorte de CI e suíte mockada após `d72036b` |

Os diretórios `evidence/performance-*` da tabela ficam sob `docs/runbooks/`. A reprodução deve seguir os comandos de cada runbook, com a mesma versão de código, fixture e ambiente. Benchmarks de banco utilizam bases sintéticas descartáveis e podem criar/remover dados e papéis locais; não devem ser apontados para uma base clínica real.

Nesta consolidação não foi introduzida uma nova otimização de aplicação. A tentativa local do item 14 foi removida antes da sincronização; os commits remotos posteriores, inclusive a implementação independente de 14, foram preservados. O avanço comprovado é específico e verificável: menos trabalho repetido nos fluxos medidos, menor custo regional de SQL, menor download inicial em cenários definidos e listagens limitadas, com os limites de latência e publicação registrados.

