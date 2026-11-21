# Performance 08 — consultas e operações por item

Implementação na branch `agent/codex/performance-diagnosis`, a partir de `c076882`. Medições realizadas em 17/11/2026. As alterações se concentram no backend; não há migration, mudança de schema, RLS, permissões ou dependências.

## Comparativo medido

| Operação sintética | SQL do alvo antes → depois | SQL total antes → depois | Mediana antes → depois | Redução da mediana |
|---|---:|---:|---:|---:|
| Salvar dieta, 6 refeições / 30 alimentos com preferência | 30 → 1 | 58 → 29 | 54,97 → 32,70 ms | 40,5% |
| Resolver demonstrações de 30 exercícios próprios | 30 → 1 | 34 → 5 | 18,12 → 2,64 ms | 85,4% |
| Importar modelo de treino com 30 exercícios próprios para rascunho | 60 → 2 | 71 → 13 | 44,56 → 15,53 ms | 65,2% |
| Gerar alertas, 100 clientes / 8.475 registros de tracking | 200 → 2 | 206 → 8 | 189,02 → 43,32 ms | 77,1% |

Fonte: [antes](evidence/performance-08/before.json) e [depois](evidence/performance-08/after.json), com todas as amostras. SQL do alvo conta comandos que acessam `food_preferences`, `custom_exercises` ou `DailyTracking`, conforme a operação. SQL total inclui contexto clínico, controle de transação, locks, consultas e escritas do fluxo completo.

PostgreSQL **16.15**, Node **24.19.0**, Prisma **7.10.0**; Docker local, conexão por loopback, sem latência artificial. Cada operação tem dois aquecimentos e sete repetições; a tabela usa a mediana. Seed, limpeza do fixture, validação do resultado e EXPLAIN ficam fora do intervalo medido. Antes/depois foram executados sequencialmente sem build/testes concorrentes. Uma rodada anterior com possível concorrência foi substituída pela rodada pareada arquivada.

O cron usa o papel jobs real de teste; os outros fluxos usam `PrismaService.runAsProfessional` e o papel clínico. Ambos passam pela verificação de papel da aplicação: não são superusuários, não têm BYPASSRLS e não são proprietários das tabelas. O administrador é usado exclusivamente para preparar/conferir os dados sintéticos. A medição começa na chamada do serviço e inclui sua transação; não mede HTTP, JWT, navegador, Render ou latência de produção.

Os hashes dos resultados de preferências, conteúdo com demonstrações e snapshot de alertas são idênticos entre as versões. O fixture de alertas inclui futuro, outra modalidade e par profissional/cliente incorreto: o resultado esperado é 50 alertas de inatividade, 25 de abandono e 25 de sobrecarga. Importação exige rascunho `OPEN` e é coberta também pelos testes de contrato existentes.

## Alterações e garantias

- `api/src/modules/diet-plans/diet-plans.service.ts`: coleta preferências elegíveis, deduplica por alimento/quantidade com a última medida prevalecendo e escreve um `INSERT ... SELECT jsonb_to_recordset(...) ON CONFLICT DO UPDATE`. JSON, profissional e horário são parâmetros. UUID e `updatedAt` são explícitos porque eram gerados pelo Prisma. IDs existentes são preservados; quantidades não são arredondadas. O lock do cliente, ownership, ordem de criação e transação permanecem.
- `api/src/modules/workouts/exercise-demonstration.service.ts`: carrega referências CUSTOM distintas em um lote autorizado por profissional. A consulta começa apenas na primeira referência válida que exige banco. Preserva a ordem dos erros, catálogo, snapshots reutilizáveis inclusive nulos/removidos, comparação exata de IDs TEXT e cópias independentes. A resolução pública de uma referência individual continua disponível.
- `api/src/modules/workouts/exercise-library.service.ts` e `workout-templates.service.ts`: lookup em lote para atualizar referências dos modelos, mantendo validação sequencial e o conflito específico para exercício indisponível. Importação faz um lote para atualização e outro para construir os snapshots no rascunho.
- `api/src/modules/alerts/alerts.cron.service.ts`: dois comandos de tracking por lote de até 500 pares exatos `(professionalId, clientId)`. `MAX(completedAt)` até o instante de corte resolve inatividade/abandono; somente as últimas duas semanas são transferidas para contar dias UTC de sobrecarga. Permanecem os limites inclusivos de 5/14/21 dias, exclusão do futuro, ordem/mensagens, advisory lock e substituição atômica do snapshot. Para zero clientes não há leitura de tracking.

## Planos reais de execução

Os comandos de tracking capturados pelo driver foram executados com `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` sob o mesmo papel jobs. [Planos antes](evidence/performance-08/before-plans.json.gz) e [planos depois](evidence/performance-08/after-plans.json.gz) contêm SQL e planos completos, comprimidos para facilitar versionamento. Para ler: `gzip -cd docs/runbooks/evidence/performance-08/after-plans.json.gz`.

| Consulta | Nó principal | Linhas retornadas | Execução | Buffers hit / read |
|---|---|---:|---:|---:|
| Antes: tracking recente do primeiro cliente (sem histórico) | Index Scan | 0 | 0,157 ms | 4 / 0 |
| Antes: tracking antigo desse cliente | Limit | 0 | 0,055 ms | 2 / 0 |
| Depois: última atividade dos 100 pares | Aggregate | 75 | 8,980 ms | 797 / 0 |
| Depois: tracking recente dos 100 pares | Bitmap Heap Scan | 525 | 1,650 ms | 347 / 0 |

Cada comando posterior cobre o lote inteiro; os dois comandos anteriores cobrem apenas um cliente. Os tempos individuais não são comparáveis como se a abrangência fosse igual. O ganho foi comprovado no fluxo completo. O agregado lê 8.175 linhas antes de agrupar; o plano usa índices existentes, BitmapAnd/BitmapOr, ordenação e aggregate. O histórico muito maior continua sendo um risco a monitorar: `MAX` por lote reduz viagens, mas precisa examinar o histórico autorizado. Nenhum índice foi criado para esconder esse custo.

## Reproduzir com segurança

O benchmark versionado é `api/test/performance/nplus1.benchmark.ts`. Ele usa os fixtures existentes, que recusam URLs diferentes da base local de teste e das portas 5434/5435. Cria uma base aleatória `safemove_security_*`, aplica nela os arquivos de schema já existentes e a remove no `finally`. Só execute contra um PostgreSQL **descartável**; ele cria papéis sintéticos locais para exercer RLS. Não é um comando de produção.

Com o container de teste já disponível em 5435 e o Prisma Client gerado, na pasta `api`:

```bash
LOCAL_TEST_PG_PORT=5435 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/ecossistema_resiliencia_test \
DIRECT_URL=postgresql://postgres:postgres@localhost:5435/ecossistema_resiliencia_test \
NPLUS1_REPORT_PATH=/tmp/nplus1-after.json \
node -r ts-node/register test/performance/nplus1.benchmark.ts
```

Para medir o código anterior sem trocar o checkout atual, extraia `api/` de `c076882` para uma pasta temporária, sem `.env`; disponibilize o mesmo `node_modules` nessa pasta e acrescente `NPLUS1_SOURCE_ROOT=/caminho/temporario/api`. Use o mesmo comando/fixture/máquina e não rode builds/testes durante a comparação. O papel do benchmark é contar SQL efetivamente enviado pelo driver `pg`, não apenas chamadas aos métodos do Prisma. Não há limiar de milissegundos em testes automatizados, pois depende da máquina.

## Validação

| Gate | Resultado |
|---|---|
| API `npm run build` | Aprovado |
| API ESLint completo, sem `--fix` | Aprovado, zero erros/avisos |
| API `tsc --noEmit --incremental false` | Aprovado, incluindo testes e benchmark |
| API unitários `npm test -- --runInBand` | 801/801, 60 suítes |
| API teste de modelos após ajuste de tipagem do mock | 10/10 |
| API PostgreSQL/HTTP/RLS `npm run test:e2e -- --silent` | 255/255, 40 suítes |
| Web build e pós-build | Aprovado, contrato de direção/CSP em 31/31 páginas e runtime standalone |
| Web `npm run lint` | Aprovado, zero avisos |
| Web `npm test -- --maxWorkers=2` | 751/751, 95 arquivos |
| `git diff --check` | Aprovado |

O lint da API foi executado diretamente por `node node_modules/eslint/bin/eslint.js '{src,apps,libs,test}/**/*.ts'`, pois o script npm inclui `--fix`. A rodada PostgreSQL final usa as URLs sintéticas na porta 5434 e `NODE_OPTIONS=--max-old-space-size=4096`. A primeira tentativa em 5435 encontrou duas suítes antigas com 5434 fixo e esgotou o heap padrão; a repetição completa na porta exigida, com memória suficiente para o runner, passou. As suítes existentes de integração, os limites da aplicação e a configuração versionada foram preservados. A tipagem de um novo teste de integração e de um mock de modelos foi corrigida antes dos gates finais. O aviso preexistente TS-jest TS151002 permanece nos unitários.

O teste novo `api/test/batched-food-preferences.e2e-spec.ts` verifica inserção/conflito real, UUID/timestamp, preservação do outro profissional, leitura/escrita com RLS e rollback da preferência, criação e ativação da dieta mediante falha controlada. Os testes unitários novos verificam cardinalidade, deduplicação, parametrização, ordem dos erros, snapshots e transição de 500 para 501 clientes. As suítes existentes exercem autenticação, ownership, concorrência, modelos e persistência.

## Conferência manual em homologação

1. Nutrição → abrir um cliente → criar plano com várias refeições e medidas caseiras → salvar → reabrir e conferir alimentos, quantidades, medidas e plano ativo. Repetir alimento/quantidade em duas refeições com medidas diferentes; conferir a última preferência em novo preenchimento.
2. Personal → abrir um aluno → montar treino com vários exercícios próprios e de catálogo → salvar rascunho → reabrir → finalizar → conferir ficha e demonstrações. Alterar a versão de um vídeo antes de salvar uma seleção antiga e conferir o conflito/recuperação já existentes.
3. Personal → importar um modelo com exercícios próprios → conferir ordem, conteúdo e demonstrações no rascunho. Conferir a mensagem existente ao importar um modelo com exercício indisponível.
4. Entrar com uma segunda conta → confirmar que não aparecem clientes, exercícios privados, preferências ou modelos privados da primeira.
5. No ambiente de teste, executar a geração de alertas com os casos de 5/14/21 dias e conferir dashboard. Não disparar manualmente o job em produção como parte deste teste.

## Limites e acompanhamento

Tempos de telas/salvamentos via navegador e produção continuam **não medidos** nesta etapa, conforme a orientação de usar apenas as medições disponíveis. A publicação da branch não representa deploy ou alteração do banco de produção.

Os loops de busca/criação de alimentos na cópia/importação de modelos alimentares (`diet-plans.service.ts:419` e `:639`) permanecem como melhoria futura. A busca atual usa `contains` sem ordenação e pode reutilizar alimento criado na iteração anterior; transformar isso em lote exige definir e testar essa escolha para preservar comportamento. Eles são distintos do upsert de preferências corrigido aqui. Esta entrega não afirma eliminar todo loop de acesso a dados do projeto.

Commits de implementação: `05ed778` (preferências), `9b7c506` (exercícios/modelos) e `8555e5f` (alertas). Para desfazer, use `git revert 8555e5f 9b7c506 05ed778` e repita a validação; nenhuma reversão de schema ou SQL é necessária. Nenhuma das quatro medianas medidas piorou.
