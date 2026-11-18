# Performance 22 — gráficos e componentes pesados sob demanda

## Resultado

Implementação na branch `agent/codex/performance-diagnosis`, commit de código `5f1aad2`, comparada ao baseline `ab9b735`. Gráficos e modais condicionais usam `next/dynamic`. Recharts deixou de ser baixado na ficha do Personal, no histórico de exames vazio, na listagem da central de exames e na evolução de Nutrição antes da seleção de um cliente. Redução de **30,65% a 31,88%** de JavaScript gzip nesses cenários.

Cabeçalhos, filtros, listas e hooks de dados continuam imediatos. Gráficos já visíveis por padrão continuam sendo montados quando os dados chegam, inclusive o primeiro aluno da evolução do Personal. Não há espera por clique, scroll ou IntersectionObserver nesses gráficos. O carregamento da biblioteca tem placeholders com o espaço do gráfico reservado.

Escopo exclusivamente frontend: nenhuma alteração em API, banco, autenticação, RLS, dependências ou configuração regional. O código foi publicado na mesma branch; esta etapa não promove um novo deployment de produção.

## Método e baseline

- Mesmo Next.js **16.3.8/Turbopack** instalado, mesmo ambiente e comando `NEXT_PUBLIC_API_URL=http://localhost:3000 npm run build`, antes e depois. O upstream é local; a medição não chama a API ou o banco de produção.
- Chromium instalado no ambiente, viewport **390×844**, CPU com fator 4, RTT simulado de 150 ms, download de 1,6 Mbps e upload de 0,75 Mbps. Cache desligado e prefetch de rotas bloqueado nos dois builds para isolar a rota medida.
- Sete cenários, três contextos novos por cenário em cada build: **21 antes e 21 depois**. APIs interceptadas no browser com os mesmos dados sintéticos; navegações externas bloqueadas. Cada captura registra os arquivos JavaScript solicitados antes de interações, seus bytes reais no build, gzip determinístico e `encodedBodySize` observado no Resource Timing.
- Tabela usa a **mediana da soma gzip dos arquivos solicitados**; são KiB (1.024 bytes). A compressão é calculada por arquivo, não uma suposição sobre o CDN. O JSON também contém os bytes comprimidos recebidos pelo navegador, que variam ligeiramente pela compressão HTTP.
- O marcador `recharts-wrapper`/`recharts-responsive-container` no conteúdo dos chunks identifica a presença da biblioteca; os nomes e tamanhos dos arquivos estão nos resultados. O chunk inicial de referência `0crzb660z_2d7.js`, com Recharts, media **370.817 bytes brutos / 97.687 bytes gzip**.

Evidências: [antes](evidence/performance-22/before.json), [depois](evidence/performance-22/after.json), [comparativo calculado](evidence/performance-22/comparison.json). A coleta inicial ocorre após `networkidle`; o instante de conclusão de componentes pode variar sob carga. Uma verificação adicional aguarda explicitamente os estados úteis e os SVGs visíveis, com asserções sobre o carregamento diferido: [deferred-verification.json](evidence/performance-22/deferred-verification.json).

## Antes × depois

| Cenário | JS gzip antes | JS gzip depois | Redução | Requisições JS antes → depois |
|---|---:|---:|---:|---:|
| Ficha do cliente — Nutrição, gráfico visível | 357,8 KiB | 353,8 KiB | 1,12% | 18 → 19 |
| Ficha do cliente — Personal | 357,8 KiB | 248,1 KiB | **30,65%** | 18 → 16 |
| Exames do cliente — gráfico visível | 330,5 KiB | 333,0 KiB | **−0,75%: aumento de 2,5 KiB** | 16 → 18 |
| Exames do cliente — histórico vazio | 330,5 KiB | 227,4 KiB | **31,19%** | 16 → 15 |
| Central de exames — lista inicial | 345,2 KiB | 236,6 KiB | **31,46%** | 17 → 16 |
| Evolução — Nutrição, antes de selecionar cliente | 349,3 KiB | 237,9 KiB | **31,88%** | 18 → 15 |
| Evolução — Personal, primeiro gráfico automático | 349,3 KiB | 349,6 KiB | **−0,09%: aumento de 315 bytes** | 18 → 18 |

A separação reduz downloads desnecessários e não reduz o peso intrínseco de desenhar um gráfico. O custo extra de 2,5 KiB no histórico com dados é o preço da divisão que economiza 103,1 KiB no histórico vazio; a mesma tela continua mostrando o gráfico automaticamente. Se o histórico com dados for o único cenário prioritário, é possível reverter somente a separação de `MarkerHistoryChart`, aceitando carregar Recharts também no vazio.

Na central, a verificação com espera explícita mediu **242.294 → 352.916 bytes gzip acumulados** ao abrir o comparativo: os 110.622 bytes adicionais são adiados até a ação. Na evolução de Nutrição, **243.630 → 353.822 bytes** ao selecionar o cliente. Os SVGs foram encontrados após essas ações. O payload de API não foi alterado; as contagens acima são somente JavaScript.

### LCP e limites da conclusão

| Cenário | LCP local antes, mediana | LCP local depois, mediana |
|---|---:|---:|
| Ficha Nutrição | 3.664 ms | 3.860 ms |
| Ficha Personal | 3.708 ms | 3.412 ms |
| Exames do cliente com dados | 3.252 ms | 3.012 ms |
| Exames do cliente vazio | 3.172 ms | 3.376 ms |
| Central de exames | 3.416 ms | 3.668 ms |
| Evolução Nutrição | 1.472 ms | 1.768 ms |
| Evolução Personal | 3.776 ms | 3.004 ms |

**LCP não apresentou melhora consistente.** Esses valores são exploratórios: três amostras locais, API simulada e CPU do host compartilhada com verificações. Não demonstram ganho de LCP nem uma regressão causal em produção; não são nota do Lighthouse, RUM ou tempo clínico completo. A conclusão aceita é a redução determinística de JavaScript nos cenários acima e o funcionamento progressivo, sem alterar a condição que exibe o conteúdo principal. Conferir LCP/RUM em homologação ou produção, por papel e rota, antes de atribuir uma melhora de tempo a este patch. Se a publicação mostrar regressão persistente no gráfico inicialmente visível, reverter a respectiva fronteira dinâmica e comparar novamente.

Lighthouse mobile não foi executado: o pacote não está instalado; nenhuma dependência foi adicionada para a auditoria. Não houve sessão autenticada de produção, leitura de prontuários reais ou medição de salvamento em produção.

## Mudanças por arquivo

| Arquivo | Alteração |
|---|---|
| `web/components/features/clients/BodyCompositionChart.tsx` | Mantém hook, estados e tabela no pai; importa só o desenho quando há avaliações e o modo gráfico está ativo. |
| `web/components/features/clients/BodyCompositionPlot.tsx` | Desenho Recharts extraído, com os mesmos dados, eixos, cores, legenda e dimensões de 300 px; props tipadas. |
| `web/app/clientes/[id]/page.tsx` | Avaliação física e fisioterapêutica por import dinâmico, conservando suas condições originais de montagem e callbacks. |
| `web/app/clientes/[id]/exames/page.tsx` | Retira Recharts da página; histórico vazio e aba de registro não montam o gráfico. Consulta e formulário preservados. |
| `web/components/features/lab-exams/MarkerHistoryChart.tsx` | Desenho de 400 px extraído; tooltip conserva marcador/unidade, com payload tipado em lugar do `any` anterior. |
| `web/app/exames/page.tsx` | Comparativo longitudinal, cadastro de laudo, pedido e drawer importados apenas nas condições que já os exibiam. |
| `web/app/evolucao/page.tsx` | Detalhe com gráficos de Nutrição importado quando um cliente é selecionado. |
| `web/components/features/evolution/personal/PersonalEvolutionWorkspace.tsx` | Detalhe com gráficos separado; mantém a seleção inicial automática do primeiro aluno. |
| `web/components/features/clients/ClientRecord.test.tsx` | Aguarda o campo do modal assíncrono antes de preencher; preserva a asserção de gravação para o cliente correto. |

Os demais arquivos são este runbook, evidências e rastreamento de status. O dynamic import existente da nova dieta foi preservado. Os gráficos da página de relatórios e a divisão completa dos workspaces por papel ficam fora desta alteração: precisam de sua própria medição, pois podem ser conteúdo principal. Nenhuma biblioteca foi substituída.

## Validação

- `npm run build` antes/depois: aprovado, incluindo TypeScript e gates pós-build de **32/32 páginas** e standalone sem dependências de desenvolvimento/arquivos de ambiente.
- `npm run typecheck` e `npm run lint`: aprovados após a alteração.
- `npm test`: **773/773 testes, 99 arquivos**. Uma primeira execução mostrou que o teste de fisioterapia buscava o campo de forma síncrona; foi atualizado para esperar o import. A execução completa seguinte passou, incluindo a gravação e seu payload.
- Chromium mobile: **21 capturas antes, 21 depois e sete verificações adicionais**, sem erros JavaScript não tratados. Recharts ausente antes da necessidade nos quatro cenários previstos, e presente após abrir gráficos.
- Desktop e mobile: drawer abre/fecha; formulário de laudo abre, adiciona marcador e fecha; formulário de pedido abre/fecha; aba longitudinal renderiza SVG. Tudo com APIs sintéticas e zero gravações.
- Carga de Recharts atrasada artificialmente apenas no teste funcional: placeholder de 300/400 px aparece e é substituído pelo SVG nas duas telas. Evidência: [ações e placeholders](evidence/performance-22/actions.json).
- `git diff --check`: aprovado. Backend e banco não foram alterados; suas suítes não são apresentadas como novas execuções desta etapa.

## Reprodução

Ferramentas usadas: Python com Playwright e Chromium disponíveis no ambiente de execução; não são dependências do aplicativo.

1. No commit de referência e depois no commit alterado, executar em `web`: `NEXT_PUBLIC_API_URL=http://localhost:3000 npm run build`.
2. Iniciar o mesmo build em ambos: `NEXT_PUBLIC_API_URL=http://localhost:3000 npm start -- --hostname 127.0.0.1 --port 3101`. Next exibe aviso por `output: standalone`; o runner local funciona com os assets de `.next`. Para hospedagem, usar o artefato standalone previsto pelo projeto.
3. Na raiz: `python docs/runbooks/evidence/performance-22/measure-progressive-loading.py --runs 3 --output /tmp/perf22-result.json`. Usar o mesmo script também para o baseline; para rodar contra o commit antigo, conservar uma cópia do script fora do checkout e ajustar seu `ROOT` para a pasta `web` correspondente.
4. No build alterado, acrescentar `--expect-deferred` para rejeitar Recharts precoce nos quatro cenários previstos. O script espera os gráficos visíveis por padrão e não exige ausência da biblioteca nessas telas.
5. Na raiz: `python docs/runbooks/evidence/performance-22/verify-progressive-actions.py` para conferir desktop/mobile, modais e placeholders. Todos os requests de API são interceptados com fixtures; não iniciar API real para esse teste.

As primeiras coletas usaram `networkidle`; a versão final do runner também espera explicitamente o estado útil da tela, para evitar capturar um gráfico visível antes de sua montagem em hosts ocupados. Os sete resultados dessa verificação concordam com os valores representativos de JavaScript da tabela; os números históricos de LCP foram preservados, sem misturar execuções.

## Teste manual e rollback

1. Em Nutrição, abrir uma ficha com avaliações, alternar Gráfico/Tabela e abrir Avaliar. Conferir os dados, tooltip e salvamento em prontuário de teste.
2. Em Personal, abrir a ficha e `/evolucao`; o primeiro gráfico deve continuar automático. Abrir o comparativo e imprimir, verificando que o SVG terminou de carregar.
3. Na central `/exames`, abrir Comparativo Longitudinal, selecionar um marcador com dados, abrir um laudo na visualização Cards e abrir os formulários de laudo/pedido. Fechar e reabrir os diálogos; conferir foco e valores.
4. Em `/clientes/[id]/exames`, conferir histórico vazio e com dados, trocar o marcador e a aba Novo Registro. Com rede lenta, o espaço do gráfico deve permanecer reservado durante o import.
5. Em Fisioterapia, abrir Nova avaliação fisioterapêutica e salvar somente em prontuário de teste; cliente e payload devem continuar corretos.

Rollback de código: reverter `5f1aad2` e construir novamente. É uma única alteração funcional, sem SQL, mudança de API ou restauração de dados. A redução de bundle não elimina a necessidade de baixar o gráfico quando ele é exibido, nem os cold starts da API.
