# Banco de Receitas Versionado — Design

**Data:** 2026-09-21

**Status:** Aprovada pelo mantenedor em 2026-09-21

**Branch de integração:** `codex/BancodeReceitas`

## 1. Contexto

A área profissional de Nutrição já possui banco de alimentos e montagem de
planos alimentares por refeições. A rota `/receitas`, porém, ainda é apenas um
placeholder. O objetivo desta entrega é permitir que o nutricionista mantenha
uma biblioteca privada de preparações, calcule os nutrientes por porção e use
essas preparações diretamente nas refeições de uma dieta.

As decisões deste documento seguem `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md`, `docs/SECURITY.md`, o relatório atual do Graphify e o
código existente. O código continua sendo a fonte final da verdade durante a
implementação.

## 2. Escopo aprovado

Esta entrega inclui:

- criação, visualização, edição versionada, duplicação e arquivamento de receitas;
- categorização por tipo de preparação;
- composição por alimentos já existentes no banco de alimentos;
- cálculo autoritativo de calorias, macros e micronutrientes por porção;
- busca e filtros por categoria, sem glúten, sem lactose e vegano;
- associação direta de uma receita a uma refeição do plano alimentar;
- preservação da versão usada em cada plano;
- integração da receita aos totais nutricionais, impressão e lista de compras;
- isolamento por profissional, validações de ownership e proteção RLS/Data API;
- testes unitários, de integração, E2E de API e fluxo crítico do frontend.

Não fazem parte deste MVP:

- upload ou armazenamento de fotos;
- inferência automática de alérgenos ou compatibilidade vegana;
- compartilhamento público ou catálogo global de receitas;
- importação por URL, IA ou leitura de imagens;
- alteração retroativa de planos quando uma receita for editada;
- deploy da migration em produção sem uma autorização operacional específica.

## 3. Abordagens avaliadas

### 3.1 Representar receita como alimento

Seria a alternativa mais simples, pois o editor de dietas já trabalha com
`Food`. Ela foi descartada porque elimina a estrutura de ingredientes e preparo,
dificulta a lista de compras e não oferece histórico seguro de alterações.

### 3.2 Copiar toda a receita para cada item da dieta

Preserva o conteúdo usado no plano, mas duplica ingredientes e instruções em
cada dieta, aumenta o custo de manutenção e torna a rastreabilidade fraca.

### 3.3 Domínio próprio com versões imutáveis

É a abordagem escolhida. A receita possui uma identidade estável e cada edição
gera uma nova versão imutável. O item da dieta referencia a versão efetivamente
prescrita. Assim, alterações no banco de receitas nunca modificam dietas antigas
silenciosamente.

## 4. Modelo de domínio

### 4.1 `Recipe`

Representa a identidade da receita dentro da conta profissional.

Campos principais:

- `id`;
- `professionalId`;
- `status`: `ACTIVE` ou `ARCHIVED`;
- `createdAt` e `updatedAt`;
- relação com suas versões.

Índices devem favorecer listagem por `professionalId`, estado e data de
atualização. Não haverá exclusão destrutiva no fluxo normal; receitas usadas em
planos serão arquivadas.

### 4.2 `RecipeVersion`

Representa uma revisão imutável da receita.

Campos principais:

- `id`, `recipeId` e número sequencial `version`;
- `name` e `description` opcional;
- `category`;
- `servings`, sempre maior que zero;
- `instructions` opcional;
- `isGlutenFree`, `isLactoseFree` e `isVegan`;
- nutrientes calculados por porção: `kcal`, `protein`, `carbs`, `fat`, `fiber`,
  `sodium`, `calcium` e `iron`;
- `createdAt`.

A combinação `(recipeId, version)` será única. Uma versão nunca será alterada
depois de criada. O valor atual de uma receita será a versão de maior número.

### 4.3 `RecipeIngredient`

Relaciona uma versão a um alimento.

Campos principais:

- `id`;
- `recipeVersionId`;
- `foodId`;
- `quantity`, sempre maior que zero;
- `measure`, para apresentação.

`quantity` representa a quantidade usada na receita inteira e deve ser
compatível com a base nutricional do alimento. A interface mostrará a unidade
base do alimento e não realizará conversões implícitas entre grandezas
incompatíveis. Alimentos repetidos na mesma versão serão rejeitados para evitar
dupla contagem acidental.

### 4.4 Associação com `MealItem`

`MealItem.foodId` passará a ser opcional e será adicionado
`recipeVersionId` opcional. Uma constraint SQL garantirá a regra XOR: todo item
de refeição deve referenciar exatamente um alimento ou uma versão de receita,
nunca ambos e nunca nenhum.

Para alimentos, `quantity` mantém o significado atual. Para receitas,
`quantity` representa o número de porções e `measure` será apresentado como
“porção” ou “porções”.

## 5. Versionamento e snapshot clínico

Ao editar uma receita, a API executará uma transação que:

1. confirma que a receita pertence ao profissional autenticado;
2. compara `expectedVersion` com a versão atual;
3. retorna HTTP 409 se outra edição tiver criado uma versão mais recente;
4. recalcula os nutrientes usando os alimentos persistidos;
5. cria `RecipeVersion` e `RecipeIngredient` sem alterar versões anteriores;
6. atualiza apenas o timestamp da identidade `Recipe`.

Uma dieta já salva continua ligada à versão antiga. Ao abrir o editor de uma
dieta, o nutricionista verá a versão prescrita. A atualização ocorrerá somente
por uma ação explícita no editor — atualizar a receita para a versão atual ou
remover e adicioná-la novamente — seguida do salvamento da dieta.

O backend nunca confiará em macros enviados pelo navegador. O cliente enviará
identificadores e quantidades; os valores nutricionais serão resolvidos e
calculados no servidor.

## 6. Cálculo nutricional

Para cada ingrediente e nutriente:

```text
valor_do_ingrediente = valor_do_alimento / baseAmount_do_alimento * quantity
```

O total da receita é a soma dos ingredientes. O valor por porção é:

```text
valor_por_porção = total_da_receita / servings
```

O item da dieta contribui para os totais do plano com:

```text
valor_no_plano = valor_por_porção_da_versão * quantity_de_porções
```

O cálculo abrangerá kcal, proteínas, carboidratos, gorduras, fibras, sódio,
cálcio e ferro. Quantidades não finitas, negativas ou iguais a zero serão
rejeitadas. A API armazenará os valores calculados da versão e arredondará
somente para apresentação, evitando erro acumulado durante a soma.

## 7. Categorias e restrições

As categorias iniciais serão:

- `BREAKFAST` — Café da manhã;
- `MAIN_MEAL` — Refeição principal;
- `SNACK` — Lanche;
- `DESSERT` — Sobremesa;
- `DRINK` — Bebida;
- `OTHER` — Outros.

Os marcadores sem glúten, sem lactose e vegano serão informados manualmente
pelo nutricionista. A interface apresentará uma mensagem clara de que os
marcadores não são inferidos nem substituem a conferência dos ingredientes e
rótulos. Eles serão filtros combináveis, sem promessa automática de segurança
alergênica.

## 8. API

Será criado um `RecipesModule` com `JwtAuthGuard`, `RolesGuard` e os papéis de
domínio da Nutrição.

Endpoints previstos:

- `GET /recipes`: lista apenas receitas do profissional, com busca, categoria,
  restrições e estado;
- `POST /recipes`: cria a receita e sua versão 1;
- `GET /recipes/:id`: retorna a receita própria e suas versões;
- `PATCH /recipes/:id`: cria uma nova versão usando `expectedVersion`;
- `POST /recipes/:id/duplicate`: cria uma nova receita própria a partir da
  versão atual;
- `PATCH /recipes/:id/archive`: arquiva;
- `PATCH /recipes/:id/restore`: restaura.

O DTO de item do plano aceitará `foodId` ou `recipeVersionId`. O service de
dietas validará a regra XOR, ownership da receita e existência da versão dentro
da transação de criação do plano. Preferências de medida continuarão sendo
gravadas somente para itens de alimento.

Os fluxos de modelos de planos, duplicação e importação serão atualizados para
preservar `recipeVersionId`. Templates do sistema existentes continuarão
utilizando apenas alimentos.

## 9. Frontend

A rota `/receitas` deixará de usar `FeaturePlaceholder` e será composta por
componentes de negócio e hooks tipados, sem concentrar todo o domínio na página.

A experiência incluirá:

- cabeçalho com ação “Nova receita”;
- busca textual e filtros combináveis;
- lista responsiva com nome, categoria, porções, macros e restrições;
- estados de carregamento, vazio, erro e ausência de resultados;
- formulário de receita com seleção de alimentos e cálculo prévio em tempo real;
- visualização das versões e aviso quando uma versão antiga estiver em uso;
- ações de editar, duplicar, arquivar e restaurar;
- confirmação antes de ações destrutivas ou de arquivamento.

No editor de dietas, o seletor ganhará abas “Alimentos” e “Receitas”. O estado
dos itens passará a ser uma união tipada. Receitas exibirão macros por porção e
serão adicionadas em número de porções.

A impressão mostrará nome, quantidade de porções e preparo da versão prescrita.
A lista de compras expandirá cada ingrediente pela fórmula:

```text
quantidade_para_compra = quantidade_do_ingrediente
  * porções_prescritas / rendimento_da_receita
  * dias_da_lista
```

## 10. Segurança e RLS

Cada leitura e escrita de receita deverá incluir `professionalId` derivado do
JWT. Buscar por `id` sem ownership não será permitido. Para evitar enumeração,
recursos inexistentes e recursos de outro profissional retornarão a mesma
resposta de não encontrado quando apropriado.

As novas tabelas `recipes`, `recipe_versions` e `recipe_ingredients` nascerão
com RLS habilitado e com a policy defensiva de bloqueio da Data API já adotada
pelo projeto. A migration também revogará privilégios diretos relevantes. O
backend Prisma continua responsável pelo isolamento entre profissionais porque
sua conexão administrativa pode ignorar RLS; portanto, RLS não substituirá
guards, ownership e testes negativos.

Nenhuma informação clínica ou conteúdo de receita será persistido em
`localStorage` ou `sessionStorage`, nem incluído em logs de erro.

## 11. Tratamento de erros

- HTTP 400 para DTO inválido, receita sem ingredientes, rendimento inválido,
  alimento duplicado ou item de refeição que viole a regra XOR;
- HTTP 404 para receita, versão ou alimento não encontrado no escopo permitido;
- HTTP 409 para edição baseada em versão desatualizada;
- mensagens de interface específicas, preservando o formulário em falhas
  recuperáveis;
- nenhuma falha de busca deve deixar o editor de dietas em estado parcialmente
  salvo.

## 12. Estratégia de testes

A implementação seguirá testes antes do código funcional.

### API unitária

- cálculo de todos os nutrientes e divisão por porções;
- validação de quantidades e ingredientes repetidos;
- criação da versão 1 e edição como nova versão;
- conflito por `expectedVersion`;
- filtros combinados;
- arquivamento, restauração e duplicação;
- bloqueio de leitura e escrita entre profissionais;
- associação de versão própria à dieta e rejeição de versão alheia;
- preservação de versões antigas em planos existentes;
- regra XOR entre alimento e receita.

### API E2E

- autenticação e papéis;
- CRUD versionado pelo fluxo HTTP;
- isolamento com dois nutricionistas;
- criação e leitura de plano contendo alimento e receita;
- ausência de regressão nos endpoints atuais de alimentos e dietas.

### Frontend

- hooks de listagem e mutações;
- filtros, estados vazios e mensagens de erro;
- construtor de ingredientes e cálculo prévio;
- adição da receita à refeição e totais nutricionais;
- atualização explícita de versão;
- lista de compras com expansão dos ingredientes;
- Cypress do caminho crítico: criar receita, filtrar, associar e salvar dieta.

## 13. Sequência de entrega

1. testes de domínio e migration Prisma com constraints, índices e RLS;
2. módulo de receitas e cálculos no backend;
3. integração versionada com `DietPlansService` e templates;
4. hooks, tipos e tela `/receitas`;
5. integração no editor de dietas, impressão e lista de compras;
6. testes completos, build, Cypress e atualização incremental do Graphify;
7. revisão por subagentes conforme o padrão de implementação e revisão já
   solicitado pelo mantenedor.

## 14. Critérios de aceite

A funcionalidade será considerada concluída quando:

- um nutricionista criar uma receita com ingredientes e receber macros corretos
  por porção;
- filtros e busca retornarem somente suas receitas;
- outro profissional não conseguir ler, editar ou associar a receita;
- editar a receita criar uma versão nova sem modificar dietas existentes;
- a versão atual puder ser associada explicitamente a uma refeição;
- totais, impressão e lista de compras refletirem a versão prescrita;
- as novas tabelas estiverem protegidas pelo padrão de RLS/Data API;
- validação Prisma, typecheck, testes, build e fluxo Cypress crítico passarem;
- o placeholder de `/receitas` tiver sido substituído pela experiência funcional;
- nenhuma foto ou blob tiver sido introduzido no banco ou no Supabase Storage.
