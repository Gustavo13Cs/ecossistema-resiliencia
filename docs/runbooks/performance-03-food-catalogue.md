# Performance 03 — chamadas do catálogo da nova dieta

## Resultado

Correção em `d208c02`, na branch `agent/codex/performance-diagnosis`, comparada ao baseline `6e83015`. Abertura do catálogo e troca de fonte passaram de **duas para uma chamada HTTP por necessidade**. O roteiro completo caiu de **8 para 5 chamadas (−37,5%)**, tanto no build de produção local quanto em desenvolvimento.

A busca textual mantém o debounce de 500 ms e o mínimo de dois caracteres. O catálogo sem texto é agendado com zero milissegundos, sem introduzir espera fixa de 500 ms na abertura. Respostas de uma busca/fonte anterior não substituem a atual. Seleção, edição, exclusão, cadastro e salvamento permaneceram funcionais nos testes.

Implementação exclusivamente frontend, publicada na mesma branch. Não houve mudança de biblioteca, API, banco, RLS, autenticação, permissões ou deployment de produção nesta etapa.

## Causa comprovada e mudança

No baseline, `web/app/clientes/[id]/nova-dieta/page.tsx:169` tinha um efeito que chamava `fetchFoods` imediatamente quando a busca estava vazia. Outro efeito, próximo da linha 239, fazia a mesma chamada 500 ms depois. Ambos reagiam à autorização inicial e à troca de fonte. O problema também permitia que uma resposta antiga, ainda pendente, substituísse uma fonte mais recente.

O efeito único em `page.tsx:236` decide qual endpoint consultar, conserva os estados locais usados pelo CRUD e limpa timer/requisição na troca de termo, fonte, cliente, conta ou desmontagem. O timer de zero para busca vazia permite que o cleanup do replay de montagem do Strict Mode remova o primeiro agendamento antes de enviar a requisição. O Strict Mode continua habilitado; não há flag global de “já carregou” que impeça consultas futuras.

A leitura usa `api.get<FoodNutrition[]>` e `AbortController`. A resposta só atualiza a lista se a operação ainda estiver ativa. O indicador de busca é reiniciado ao mudar a necessidade. Falhas conservam a lista exibida, mantendo o tratamento anterior. As condições `canUseDietEditor`, papel e prontuário autorizado foram preservadas.

## Medição antes × depois

Chromium local, viewport 1440×900, com as APIs interceptadas por fixtures sintéticas. Foram executados o mesmo roteiro e os mesmos dados no baseline e no patch, em `next start` e em `next dev` com o Strict Mode padrão do App Router. Cada ação aguarda 850 ms, cobrindo também a duplicação tardia de 500 ms. Os endpoints reais da produção não foram acessados.

| Necessidade | Produção local antes → depois | Desenvolvimento antes → depois |
|---|---:|---:|
| Abrir editor autorizado, busca vazia | **2 → 1** | **2 → 1** |
| Trocar fonte vazia para TACO | **2 → 1** | **2 → 1** |
| Digitar rapidamente `ar` → `arroz` | 1 → 1 | 1 → 1 |
| Limpar busca | 1 → 1 | 1 → 1 |
| Trocar fonte vazia para TODAS | **2 → 1** | **2 → 1** |
| Fechar/reabrir sem alterar filtros | 0 → 0 | 0 → 0 |
| Adicionar alimento e finalizar | 0 → 0 | 0 → 0 |
| **Total do roteiro** | **8 → 5 (−37,5%)** | **8 → 5 (−37,5%)** |

A contagem inclui somente `GET /foods` e `GET /foods/search`. Consultas de cliente, prescrição ativa, preferências de medida e o POST de salvamento não são chamadas de catálogo e não integram a tabela. Adicionar o alimento e salvar gerou uma única prescrição sintética, com o cliente e o alimento corretos, nos quatro roteiros de browser.

Evidências completas com filtros e timestamps:

- [Antes, produção local](evidence/performance-03/before-production.json) e [depois](evidence/performance-03/after-production.json).
- [Antes, desenvolvimento](evidence/performance-03/before-development.json) e [depois](evidence/performance-03/after-development.json).
- [Comparativo calculado](evidence/performance-03/comparison.json).

Não foram medidos tempo real de banco, latência de API em produção, Lighthouse ou LCP. A redução de 37,5% refere-se a requests desse roteiro, sem estimativa inventada de tempo de tela ou de SQL.

## Regressões e fluxos funcionais

Os testes foram escritos antes da mudança. No baseline, **quatro dos cinco falharam** pelos comportamentos esperados: duplicação inicial, duplicação na montagem com Strict Mode, duplicação ao trocar fonte e sobrescrita por resposta antiga. O caso de debounce já passava e protege o comportamento existente. Com o patch, **5/5 passaram**.

O teste de Strict Mode monta o editor já autorizado e pronto: nesse cenário específico, o baseline fazia **3 requests**, e o patch faz **1**. Isso difere da navegação completa no browser, que começa sem o prontuário carregado e apresentou 2→1. Os resultados não foram misturados.

Cobertura dos cinco casos:

1. Um catálogo inicial antes/depois da janela de debounce, exibindo o alimento retornado.
2. Uma chamada quando os efeitos de montagem são repetidos pelo Strict Mode.
3. Uma chamada para nova fonte e nenhuma ao clicar novamente na fonte ativa.
4. Busca com debounce, ausência de request para um caractere e uma atualização ao limpar.
5. Resposta antiga deliberadamente atrasada não sobrescreve a nova fonte.

No browser de produção local, um roteiro adicional editou um alimento manual, excluiu esse alimento ainda não prescrito, cadastrou outro, adicionou-o à refeição e salvou a dieta. Houve **somente um GET inicial de catálogo** durante esse fluxo; as mutações refletiram na lista pelos estados locais existentes. O salvamento manteve `clientId=c1` e `foodId=manual-new`. Toda a persistência foi simulada pelo interceptador; não é uma validação de gravação clínica em banco real. [Evidência de edição](evidence/performance-03/food-editing.json).

## Arquivos e gates

| Arquivo | Mudança |
|---|---|
| `web/app/clientes/[id]/nova-dieta/page.tsx` | Remove o efeito concorrente e o helper duplicado; efeito único, debounce preservado, cancelamento e proteção contra resultado obsoleto. |
| `web/app/clientes/[id]/nova-dieta/food-catalog.test.tsx` | Cinco regressões de requests, lista exibida, Strict Mode e respostas fora de ordem. |
| Este runbook, evidências, `docs/TASKS.md`, `docs/agents/CODEX_STATUS.md` | Comparativo, reprodução e status. |

- `npm test`: **778/778 testes, 100 arquivos**.
- Build Next.js, TypeScript e lint: aprovados. Pós-build confirmou **32/32 páginas** e standalone sem pacotes de desenvolvimento/arquivos de ambiente.
- Browser antes/depois em desenvolvimento e produção local: aprovado, sem erros JavaScript não tratados, com as contagens acima.
- CRUD manual e salvamento simulado: aprovados.
- `git diff --check`: aprovado. Backend, dependências, configuração, proxy, auth e cliente HTTP sem alterações contra o baseline. Suítes de banco/API não foram repetidas para esta mudança exclusivamente frontend.

## Reprodução

Na pasta `web`, com dependências já instaladas:

1. Gerar o build com `NEXT_PUBLIC_API_URL=http://localhost:3000 npm run build` e iniciar com `NEXT_PUBLIC_API_URL=http://localhost:3000 npm start -- --hostname 127.0.0.1 --port 3104`.
2. Para desenvolvimento: `NEXT_PUBLIC_API_URL=http://localhost:3000 ./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3105`.
3. Na raiz, executar `python docs/runbooks/evidence/performance-03/measure-food-requests.py --origin http://127.0.0.1:3104 --expect-single --output /tmp/perf03-production.json`. Repetir na porta 3105. Para o baseline, conservar o runner fora do checkout, usar o build antigo e omitir `--expect-single`.
4. Para o CRUD: `python docs/runbooks/evidence/performance-03/verify-food-editing.py --origin http://127.0.0.1:3104 --output /tmp/perf03-editing.json`. Esse runner usa a fixture ao lado de seu próprio arquivo.
5. Regressões: `npm --prefix web test -- 'app/clientes/[id]/nova-dieta/food-catalog.test.tsx'`.

Os runners usam Python/Playwright e Chromium já disponíveis no ambiente; não adicionam dependências ao app e recusam origins fora de localhost. Não é necessário iniciar uma API real. Como o projeto usa `output: standalone`, `next start` emite um aviso no runner local; os gates do artefato de produção também foram executados pelo pós-build.

## Riscos, teste manual e rollback

Durante mudanças rápidas de filtros, uma requisição que já saiu pode aparecer como cancelada no Network; ela pertence à necessidade anterior. Cancelar o cliente não garante que uma query já iniciada no servidor seja interrompida. Timer removido antes do envio não gera request, e respostas de operações canceladas não substituem a lista atual.

A página conserva a lista em falha de rede, sem introduzir uma nova política de retry/cache ou mensagem de erro. O cancelamento também segue as transições de autorização/cliente/conta. As regras de acesso e o interceptor de autenticação não foram alterados.

Para conferir manualmente com uma conta Nutrição e um prontuário de teste:

1. Abrir Nova dieta com Network limpo e filtrar pelos endpoints de catálogo. Confirmar um `/foods?source=TODAS`, inclusive após aguardar mais de 500 ms.
2. Abrir Buscar e Adicionar, trocar para TACO/TBCA e confirmar uma chamada por mudança; clicar de novo na fonte ativa não consulta.
3. Digitar rapidamente `arroz`, limpar e reabrir o seletor. Conferir debounce, resultado e ausência de duplicação para estado inalterado.
4. Com rede lenta, trocar fonte durante uma consulta e conferir que a resposta antiga não retorna à tela. Cancelamentos são esperados nesse caso.
5. Adicionar alimento, alterar quantidade, editar/cadastrar alimento manual e finalizar somente em prontuário de teste. Conferir a persistência após recarregar no ambiente autorizado; a medição desta entrega não usou uma sessão de produção.

Rollback: reverter **`d208c02`** e gerar novo build. Isso restaura os efeitos anteriores; não há migration ou restauração de dados. O teste de regressão volta a falhar se a duplicação for reintroduzida.
