# Verificação de mídia — biblioteca visual Personal

Consulta original: 17/10/2026. Revalidação: 19/10/2026 (UTC). Lote implementado na Task 1; sem deploy, migração, armazenamento de arquivos ou integração HTTP no servidor clínico.

## Resultado e aceite

O usuário aprovou **ilustrações nesta entrega** em 17/10/2026, após a pesquisa de fonte alternativa. O requisito de foto/vídeo da conclusão original foi expressamente ampliado na especificação aprovada. Este lote contém **20 exercícios, 21 ilustrações SVG**, quatro exercícios de cada grupo: peitoral, costas, inferiores, ombros e core. Arnold usa frames 1 e 3 para a rotação; todos os outros usam somente o frame 1. São ilustrações, nunca fotografias nem vídeos. Os 148 IDs originais permanecem intactos e exercícios sem mídia continuam selecionáveis.

Fonte fixa: Workout Guide/Bryl Lim, revisão `aac599224bb9780305239607ef98540b7e0ce389`. Todas as obras selecionadas têm **CC BY-SA 4.0 por frame** no manifesto oficial. Quatorze frames têm origem Everkinetic/Greg Priday, revisão `446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6`; sete frames têm crédito direto a Bryl Lim (incluindo Arnold frame 3). A licença MIT do software não foi usada para aprovar as imagens.

## Documentos oficiais e condições atuais

Revalidado por HTTPS, sem conta, chave, cobrança ou autenticação. URLs e resultados de 19/10/2026:

- [guide-manifest.json](https://raw.githubusercontent.com/bryllim/workout-guide/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/manifest.json): HTTP 200, 566674 bytes.
- [guide-license.txt](https://raw.githubusercontent.com/bryllim/workout-guide/aac599224bb9780305239607ef98540b7e0ce389/LICENSE-ASSETS): HTTP 200, 578 bytes.
- [guide-attribution.md](https://raw.githubusercontent.com/bryllim/workout-guide/aac599224bb9780305239607ef98540b7e0ce389/ATTRIBUTION.md): HTTP 200, 618 bytes.
- [jsdelivr-readme.md](https://raw.githubusercontent.com/jsdelivr/jsdelivr/master/README.md): HTTP 200, 18076 bytes.
- [everkinetic-readme.md](https://raw.githubusercontent.com/everkinetic/data/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/README.md): HTTP 200, 153 bytes.
- [everkinetic-license.md](https://raw.githubusercontent.com/everkinetic/data/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/LICENSE.md): HTTP 200, 18578 bytes.

O README oficial vigente do jsDelivr descreve “free CDN for open-source files”, “stable CDN that can be used in production”, “There are no bandwidth limits or premium features, and it's completely free to use”. Documenta `/gh/` com release/commit/branch, recomenda revisão fixa para produção e limita por padrão pacotes a 150 MB e arquivos GitHub a 20 MB. Os 21 arquivos deste lote têm de 12.359 a 54.799 bytes. Não é promessa própria de serviço ilimitado nem garantia de SLA: observar termos/limites oficiais novamente em atualizações. Não foi contratada infraestrutura. Custos de tráfego do SafeMove são separados.

O caminho GitHub fixado por jsDelivr é uma distribuição normal do projeto público. O SDK da fonte usa esse CDN para o pacote npm, mas não se pressupõe equivalência entre npm 1.0.0 e esta revisão GitHub. Não usar `latest`, `main` ou fallback de variante. Política efetiva do ambiente em 19/10: revisão 19, enforced, observations_current; GitHub/jsDelivr permitidos por preset. `wger.de` continua ausente e bloqueado; nenhum domínio foi incluído, nenhuma tentativa de contorno feita. Free Exercise DB permanece sem autoria individual comprovada para fotos e não foi adotado.

Licença [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): crédito, origem e link da licença devem acompanhar a exibição. Preservar a indicação das alterações upstream. Adaptações da arte exigem mesma licença; este lote referencia os arquivos sem alterá-los, sem incorporar código do fornecedor. O manifesto registra `author`, `sourcePageUrl`, `licenseName`, `licenseUrl`, `upstreamSourcePageUrl` quando aplicável e `changes`. Os futuros detalhes e snapshots devem preservar/exibir esses campos, sem truncar os créditos. `changes` reproduz a declaração original do fornecedor e acrescenta “SafeMove: sem alterações no arquivo”. Exibir obras separadas não implica por si só relicenciar o software SafeMove.

## Mapeamentos aceitos e evidência individual

| Grupo | ID SafeMove | Nome SafeMove | ID externo | Primeiro asset/cadeia individual | Conferência |
|---|---|---|---|---|---|
| Peitoral | `cat-chest-01` | Supino reto com barra | `exercise-bench-press` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0042-tension.svg` | Banco reto, barra; posição de extensão na imagem. |
| Peitoral | `cat-chest-02` | Supino reto com halteres | `exercise-dumbbell-bench-press` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-bench-press/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0055-tension.svg` | Banco reto, dois halteres; variante separada da barra. |
| Peitoral | `cat-chest-03` | Supino inclinado com barra | `exercise-incline-bench-press` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/incline-bench-press/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0043-tension.svg` | Encosto inclinado e barra visíveis. |
| Peitoral | `cat-chest-08` | Crucifixo reto com halteres | `exercise-dumbbell-fly` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-fly/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0056-tension.svg` | Banco reto e dois halteres; abertura visível nos frames 2/3. |
| Costas | `cat-back-04` | Barra fixa pronada | `exercise-pull-up` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/pull-up/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0087-tension.svg` | Barra fixa, vista posterior e pegada pronada; origem0087 descreve palms facing forward. |
| Costas | `cat-back-09` | Remada unilateral com halter (Serrote) | `exercise-one-arm-dumbbell-row` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/one-arm-dumbbell-row/frame-1.svg) — Bryl Lim; CC BY-SA 4.0 | Um halter; mão e joelho do lado oposto apoiados em banco. |
| Costas | `cat-back-10` | Remada baixa sentada na polia | `exercise-seated-row` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-row/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0025-tension.svg` | Sentado, polia baixa/cabo horizontal e remada em direção ao tronco. |
| Costas | `cat-back-14` | Encolhimento de ombros com halteres | `exercise-dumbbell-shrug` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-shrug/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0005-tension.svg` | Dois halteres ao lado do corpo; catálogo local classifica como BACK. |
| Inferiores | `cat-quads-01` | Agachamento livre com barra | `exercise-squat` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/squat/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0122-tension.svg` | Barra nas costas; sem guia Smith. |
| Inferiores | `cat-quads-02` | Agachamento frontal com barra | `exercise-front-squat` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-squat/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0138-tension.svg` | Barra anterior apoiada nos ombros; sem Smith. |
| Inferiores | `cat-hams-05` | Mesa flexora deitado | `exercise-leg-curl` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/leg-curl/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0117-tension.svg` | Deitado em máquina, flexão de joelhos; não usar para cadeira sentada. |
| Inferiores | `cat-hams-06` | Cadeira flexora sentado | `exercise-seated-leg-curl` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-leg-curl/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0119-tension.svg` | Tronco sentado na máquina, rolo nas pernas; variante separada da mesa. |
| Ombros | `cat-shoulders-01` | Desenvolvimento com halteres sentado | `exercise-seated-dumbbell-press` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-dumbbell-press/frame-1.svg) — Bryl Lim; CC BY-SA 4.0 | Banco com encosto e dois halteres. |
| Ombros | `cat-shoulders-03` | Desenvolvimento Arnold com halteres | `exercise-arnold-press` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-1.svg) — Bryl Lim; CC BY-SA 4.0 | Variante em pé; catálogo não exige sentado. Conjunto mostra halteres baixos com palmas para o corpo e elevação/rotação. Usar frames 1 e 3 para diferenciar de desenvolvimento simples. |
| Ombros | `cat-shoulders-05` | Elevação lateral com halteres | `exercise-lateral-raise` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/lateral-raise/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0018-tension.svg` | Elevação bilateral dos braços ao lado com halteres. |
| Ombros | `cat-shoulders-08` | Elevação frontal com halteres | `exercise-front-raise` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-raise/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0033-tension.svg` | Elevação frontal alternada com dois halteres. |
| Core | `cat-core-01` | Prancha isométrica ventral | `exercise-plank` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/plank/frame-1.svg) — Bryl Lim; CC BY-SA 4.0 | Frame 1: antebraços e pés, corpo em prancha. Frame 3 dobra joelhos: excluir desse isométrico. |
| Core | `cat-core-02` | Prancha lateral isométrica | `exercise-side-plank` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/side-plank/frame-1.svg) — Bryl Lim; CC BY-SA 4.0; Everkinetic/Greg Priday, `0113-tension.svg` | Apoio lateral no antebraço, pernas estendidas; usar estática frame 1. |
| Core | `cat-core-10` | Dead Bug (Estabilização de core) | `exercise-dead-bug` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg) — Bryl Lim; CC BY-SA 4.0 | Decúbito dorsal com membros contralaterais elevados/estendidos; frame 1. |
| Core | `cat-core-11` | Perdigueiro (Bird-Dog) | `exercise-bird-dog` | [frame 1](https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bird-dog/frame-1.svg) — Bryl Lim; CC BY-SA 4.0 | Quatro apoios, elevação contralateral de braço/perna; frame 1. |

## Inventário exato por arquivo e hashes

Cada linha fixa o primeiro arquivo, o crédito individual do manifesto, origem upstream quando presente eSHA-256 do arquivo HTTP 200 inspecionado. Não gerar URLs em runtime a partir de nomes; transcrever o inventário aprovado para um futuro manifesto versionado.

### `cat-chest-01` → `exercise-bench-press`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `8d2e44a4623545d6de7318bd7e9e61ca6c70b79847ef0360973a8ad6ec4a7d27`; tamanho: 20294 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0042-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0042-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-chest-02` → `exercise-dumbbell-bench-press`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-bench-press/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-bench-press/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `11be05184926c40731c131b8925907253f54229b47bd3dd1ebb406e76f9a52cf`; tamanho: 16878 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0055-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0055-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-chest-03` → `exercise-incline-bench-press`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/incline-bench-press/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/incline-bench-press/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `732b5e42719b4799ec9646122a3ab763a57959e8fcb3ed6020d1ff46ac910516`; tamanho: 18971 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0043-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0043-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-chest-08` → `exercise-dumbbell-fly`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-fly/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-fly/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `7306d1d3fd1dfb77900b5c3be75c5858dc1f6133c255110bbb5838c3a9aceae8`; tamanho: 15689 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0056-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0056-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-back-04` → `exercise-pull-up`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/pull-up/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/pull-up/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `bacba06517e970acecfeda6cea53c5a54a169ab3229eff4757a7ad40e1db62d0`; tamanho: 12974 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0087-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0087-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-back-09` → `exercise-one-arm-dumbbell-row`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/one-arm-dumbbell-row/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/one-arm-dumbbell-row/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `b818e63d8dc40bf3bd1b59aa9fa91fd5c7bdfed99bbb2ac599c4bed328a7de2f`; tamanho: 19510 bytes; HTTP 200, idêntico ao GitHub fixado.
- O frame não declara fonte upstream no manifesto; atribuição direta a Bryl Lim.

### `cat-back-10` → `exercise-seated-row`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-row/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-row/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `c58eccc52903c9ea97544b201bc77996054a1743dd9efba14d5fc102674f1a4f`; tamanho: 12359 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0025-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0025-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-back-14` → `exercise-dumbbell-shrug`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-shrug/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-shrug/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `e6ef38df1abb8b1be80fd6c53abdae0e150668a5b8b142f3f214f7d393ca9d73`; tamanho: 16773 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0005-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0005-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-quads-01` → `exercise-squat`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/squat/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/squat/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `3c77a2088edf3271b7f2034154979e1adcdbb2e1c467ad2cc58cedc6e92d98b9`; tamanho: 14978 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0122-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0122-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-quads-02` → `exercise-front-squat`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-squat/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-squat/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `6489534c678d8f8f3b510a26de18b14e2e26c56afa993ab89a864a0d62fb74cb`; tamanho: 14212 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0138-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0138-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-hams-05` → `exercise-leg-curl`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/leg-curl/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/leg-curl/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `c80998d0d80c53b5379ec53f90b3fdea0bf802d1709e7338c0e5fda686ecda9c`; tamanho: 12457 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0117-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0117-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-hams-06` → `exercise-seated-leg-curl`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-leg-curl/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-leg-curl/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `5523521a2db068377790f52b91556a14e7b630bbf66e8e54efa110be57ecaa72`; tamanho: 15379 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0119-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0119-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-shoulders-01` → `exercise-seated-dumbbell-press`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-dumbbell-press/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-dumbbell-press/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `78d50c1ac770871a58d7637777f60e9b7fcb0c939415ca4c7e1fdd9919e7536e`; tamanho: 23640 bytes; HTTP 200, idêntico ao GitHub fixado.
- O frame não declara fonte upstream no manifesto; atribuição direta a Bryl Lim.

### `cat-shoulders-03` → `exercise-arnold-press`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `77e4e7b2aac788a69af2fbf63b37ba9f8fbcffddd6986a4f6d5864eb29b93ccb`; tamanho: 19415 bytes; HTTP 200, idêntico ao GitHub fixado.
- O frame não declara fonte upstream no manifesto; atribuição direta a Bryl Lim.
- Frame 3 adicional para a variante: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-3.svg ; autoria/licença individual igualmente Bryl Lim/CC BY-SA 4.0. Foi inspecionado visualmente via GitHub fixado; não está entre os 20 testes do CDN frame 1.

### `cat-shoulders-05` → `exercise-lateral-raise`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/lateral-raise/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/lateral-raise/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `51716817454492e555ac9796a030fc985b244c6b2b169e44ec51a9896902c34d`; tamanho: 14906 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0018-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0018-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-shoulders-08` → `exercise-front-raise`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-raise/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-raise/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `794cf691e9fabde7dd0772653c625f13538f4e2779f3e2e7f0df7fa367d82a46`; tamanho: 15274 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0033-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0033-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-core-01` → `exercise-plank`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/plank/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/plank/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `0f65a842d151f80918e4ee45d1a9f659dd5a82e2d9857c9ad6ae06832a872e94`; tamanho: 12483 bytes; HTTP 200, idêntico ao GitHub fixado.
- O frame não declara fonte upstream no manifesto; atribuição direta a Bryl Lim.

### `cat-core-02` → `exercise-side-plank`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/side-plank/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/side-plank/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `5a63eb2766074fc6a9f3d370496caf5e3e56c9b141cbd14c60939c7b9f86e36f`; tamanho: 12548 bytes; HTTP 200, idêntico ao GitHub fixado.
- Origem individual registrada: https://github.com/everkinetic/data/blob/main/dist/svg/0113-tension.svg
- Origem equivalente fixada: https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0113-tension.svg
- Autor upstream identificado pelo projeto: Everkinetic/Greg Priday; licença upstream: CC BY-SA 4.0; mudanças declaradas: Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced.

### `cat-core-10` → `exercise-dead-bug`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `0e1208250b923348fbf170f163e581be3dcc1ce7f906b14766da59a7801206a2`; tamanho: 13704 bytes; HTTP 200, idêntico ao GitHub fixado.
- O frame não declara fonte upstream no manifesto; atribuição direta a Bryl Lim.

### `cat-core-11` → `exercise-bird-dog`
- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bird-dog/frame-1.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bird-dog/frame-1.svg
- Autor declarado do arquivo: Bryl Lim; licença: CC BY-SA 4.0; URL: https://creativecommons.org/licenses/by-sa/4.0/
- SHA-256: `ab25efcaa49bc373d47f4bcf9fa9dacc7d3170bd7cd4f6d3a29bcb0d98c705ac`; tamanho: 14767 bytes; HTTP 200, idêntico ao GitHub fixado.
- O frame não declara fonte upstream no manifesto; atribuição direta a Bryl Lim.

### Arnold: segundo arquivo aceito

- Source page: https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-3.svg
- Asset: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-3.svg
- Crédito individual: Bryl Lim / Workout Guide; CC BY-SA 4.0; https://creativecommons.org/licenses/by-sa/4.0/ . Sem upstream declarado nesse frame; SafeMove não alterou o arquivo.
- Revalidado em 19/10/2026: HTTP 200, image/svg+xml, 54.799 bytes; SHA-256 `fc6a75fbb496548a36d496689f6275a1865bc5384ccfe7f16c45a105f22ee73d`.

Os 20 hashes de frame 1 acima foram recalculados em 19/10/2026 e coincidem com a pesquisa aprovada. Os 21 arquivos responderam HTTP 200 e `image/svg+xml`. Essa verificação de bytes foi limitada a 1 MiB por arquivo, somente em manutenção e sem cópia de mídia para o produto. Disponibilidade é observação pontual, não garantia futura.

## Inspeção e limites preservados

A pesquisa de 17/10/2026 realmente abriu seis pranchas (peitoral, costas, inferiores, ombros, core e complementos), com 75 SVGs temporários de 25 candidatos. A seleção de 20 foi conferida visualmente quanto a equipamento, postura e variante. Arnold frames 1 e 3 foram inspecionados nessa etapa; não se geraram capturas redundantes na implementação. O fundo dos SVGs é transparente com traços claros: a futura interface precisa de área escura/contrastante. Não usar a ordem dos frames como prova de posição inicial/final, nem animar automaticamente. Plank frame 3 foi excluído porque flexiona os joelhos. Instruções e alt text pt-BR foram redigidos para o lote, sem validação clínica por Personal/fisioterapeuta ou teste de compreensão com pacientes.

A triagem textual original de SVG não encontrou script/foreignObject/javascript/xlink:href/image nos 20 primeiros frames; não equivale a auditoria integral de SVG. Exibir como imagem externa, nunca injetar XML/HTML do fornecedor. Nenhuma demonstração por IA foi gerada; o método de produção dos frames próprios de Bryl Lim não é documentado pelo fornecedor e não se afirma ausência de IA. Direitos são sustentados pela declaração individual e pela cadeia publicada, não por perícia independente nem parecer jurídico.

Associações rejeitadas preservadas: `chin-up` narrow/parallel não é barra supinada; `barbell-row` reverse grip não é remada pronada; `chest-supported-row` de máquina não vira halteres; `lat-pulldown` underhand não vira pegada aberta pronada; Everkinetic 0288 é crunch sentado, 0285 é rollout com barra. Não reaproveitar essas obras por aproximação de nome.

## Contratos e operação

- `EXERCISE_DEMONSTRATION_MANIFEST` é a seleção atual; `DEMONSTRATION_MANIFEST_VERSION = 2026-10-19.1`, `itemRevision = 1`. Snapshot de catálogo usa `revision = <manifestVersion>:<itemRevision>` (atualmente `2026-10-19.1:1`). Novas alterações de conteúdo exigem nova revisão.
- `findCatalogDemonstration(id)` é puro, devolve uma cópia destacada ou null. Não faz rede e não infere mídia pelo nome. `LibraryReference` contém source, exerciseId e demonstrationRevision, que pode ser null.
- `validateDemonstrationManifest(entries)` checa o mapa explícito de variantes, grupo/equipamento locais, duplicatas, estrutura, limites de instrução/alt/autor/URLs, licença e cada asset. O script também exige cobertura mínima. Não executa automaticamente em requests.
- `DEMONSTRATION_MEDIA_RULES` contém somente origin `https://cdn.jsdelivr.net` e pathPrefix `/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/`. A aprovação também exige variante/frame conferidos, ID estável, HTTPS canônico sem credenciais/query/fragmento, origem GitHub correspondente e licença aceita. Este lote aprova apenas IMAGE/CC BY-SA 4.0.
- `isApprovedDemonstrationAsset(asset)` é independente da seleção atual. Ao retirar um exercício da seleção futura, preservar seu registro de variante e regra histórica. Retirada por direitos deve adicionar seu ID a `REVOKED_DEMONSTRATION_ASSET_IDS`, hoje vazio, para bloquear a apresentação sem reescrever snapshots. Não copiar `displayAllowed` ao banco: apresentação é distinta de snapshot.
- `DemonstrationAsset` inclui campos opcionais de proveniência `upstreamSourcePageUrl` e `changes`; preservar em snapshots, leituras, tipos web e créditos. As próximas tarefas implementam exibição, semântica CUSTOM e validação HTTP; esta tarefa não muda rotas/DTOs/schema/UI.
- Na futura exibição, usar `referrerPolicy="no-referrer"`, lazy loading e texto alternativo. A requisição direta revela o IP ao CDN; não enviar clientId, nome, notas ou identidade profissional. Somente `img-src` precisará desse host; este lote não justifica scripts, frames ou media-src.

Rodar explicitamente em `api/`:

```bash
npm test -- --runInBand exercise-demonstration
npx ts-node scripts/verify-exercise-demonstrations.ts --check
npx ts-node scripts/verify-exercise-demonstrations.ts --probe
```

`--check` valida localmente e não consulta hosts. `--probe` consulta somente os assets aceitos, HEAD com timeout de 10s por chamada; faz GET limitado (Range 0-0, máximo 1 MiB) somente se HEAD responder 405/501. Usa curl sem shell e herda proxy/CA do ambiente. Não segue redirects de nenhum host, exige status 200/206 e image/svg+xml, não recebe URLs de usuários e registra IDs/status sem conteúdo clínico. Falha, timeout, tipo indevido ou redirect produz exit code 1. Não agendar nem importar no caminho de prescrições.

Antes de mudar revisão/fonte: repetir licença por arquivo, conferência de variante e disponibilidade, atualizar mapa/evidência e incrementar revisões. Para retirada por direitos: registrar motivo/data, adicionar IDs revogados e testar que o snapshot continua legível enquanto a mídia fica bloqueada nas tarefas de apresentação. Falha de disponibilidade não é retirada automática por direitos e nunca deve substituir outra variante.

## Validação desta tarefa

- RED: teste do manifesto com implementação vazia, 9 falhas esperadas/1 aprovação (guarda de catálogo). RED do probe: 8 falhas esperadas/1 aprovação. Nenhum acesso externo pela suíte.
- GREEN: 21 testes focados; suíte API completa com 681 testes/56 suítes. Typecheck sem erros. Lint corrigiu estreitamento `Array.isArray` para any em readonly e fixture async sem await; resultado final registrado no relatório da tarefa.
- `--check`: `CHECK OK: 20 exercises, 21 illustrations, five groups`.
- `--probe`: 21 `PROBE OK`, todos HTTP 200 e image/svg+xml em 19/10/2026; nenhuma falha convertida em sucesso.
- Aviso ts-jest TS151002 (Node16/isolatedModules) preexistente observado; configurações não foram alteradas.

Evidência de execução bruta e relatório completo: `.superpowers/sdd/2026-10-17-personal-biblioteca-visual/task-1-logs/` e `task-1-report.md`, locais e ignorados pelo Git. Este runbook preserva o inventário público durável; não inclui arquivos de mídia nem dados clínicos. Revisão clínica, integração API/persistência/UI/CSP e validação browser pertencem às tarefas seguintes.

## Task 6 — verificação real em 20–21/10/2026

Base integrada: `a08ce6f871f590791970f7bdb83e8ae8bbcfc3e5` (Tasks 1–5). Task 6 acrescenta o harness real e sua evidência, além de corrigir o retorno de foco quando um filtro pendente substitui ou remove o botão de preview. O inventário e a proveniência da Task 1 acima permanecem verbatim.

### Ambiente e reprodução

Somente banco sintético PostgreSQL 16, 22 migrations existentes, ambas as variáveis `DATABASE_URL` e `DIRECT_URL` iguais a `postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test`. O runner verifica isolamento/portas, prepara roles e contas sintéticas, executa builds, inicia seus processos e os encerra em `finally`. Suítes PostgreSQL e navegador executam sequencialmente.

Em `api/`:

```sh
npm test -- --runInBand
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts' --max-warnings=0
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test DIRECT_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e
npx ts-node scripts/verify-exercise-demonstrations.ts --probe
npx ts-node test/run-personal-p1-real.ts --media-fixture --spec cypress/e2e/personal-exercise-library-real.cy.ts,cypress/e2e/personal-workout-drafts-real.cy.ts,cypress/e2e/personal-workspace-real.cy.ts,cypress/e2e/professional-phase1-real.cy.ts,cypress/e2e/assessments-client-real.cy.ts,cypress/e2e/client-owned-clinical-resources.cy.ts
```

Em `web/`: `TZ=America/Fortaleza npm test`, `npm run typecheck`, `npm run lint`. O runner normal executa `npm run build` na API e `INTERNAL_API_URL=http://localhost:3000 npm run build -- --webpack` na web, incluindo postbuild. O webpack atende aos node_modules compartilhados deste worktree. Os builds normais após a correção de foco passaram em `browser-integrated-final.log`; esse processo teve falha posterior no navegador e não constitui uma execução E2E aprovada.

Para alterações apenas do harness, `--reuse-build` exige opt-in, `NODE_ENV=test`, ambas as URLs literais do banco, artefatos existentes e prova com SHA-256 das fontes/config de aplicação e BUILD_ID iguais à compilação bem-sucedida. Prova final: digest `3ec8a0002421c026950ea241116c075500d4b4153eb89ba8f7bae75408385ae6`, BUILD_ID `gA1vRZKEtX70SpgosJTZ5`. As execuções finais verificaram essa prova antes de iniciar a aplicação; sem a flag, o runner sempre compila. A seleção padrão dos quatro specs P1 foi preservada. Seleção Windows/Linux foi testada pelo helper; a execução real observada foi Linux.

O ambiente sem Xvfb no host usa a imagem oficial `cypress/included@sha256:9f27bf8330595fe44dc3ba9c0c96cff1618d24241bd9f95a470f8f6e2ecfba7e` (15.14.2), usuário 1000, rede dedicada `safemove-personal-test_default`, workspace bind e CA do host somente para leitura. Bootstrap encaminha apenas localhost:5434 ao banco sintético. Comando Docker exato, logs e relatório ficam em `.superpowers/sdd/2026-10-17-personal-biblioteca-visual/`; `task-6-logs/run-browser.sh` aceita a lista de specs e `TASK6_REUSE_BUILD=1` para o reuso atestado.

### Fixture controlada e direitos

O Cypress atende somente a URL exata imutável do `frame-1.svg` de bench-press aprovado, com os bytes locais licenciados. API, banco, autenticação JWT e autorização permanecem reais. O task recusa uso sem `--media-fixture`, `NODE_ENV=test` e ambas as URLs literais. O teste de 404 substitui somente essa resposta de mídia. Não foi criado endpoint de mídia, proxy genérico ou exceção de localhost no manifesto/renderer/CSP.

[Atribuição completa e proveniência](../../web/cypress/fixtures/exercise-demonstration/ATTRIBUTION.md). SHA-256 obrigatório: `8d2e44a4623545d6de7318bd7e9e61ca6c70b79847ef0360973a8ad6ec4a7d27`. SVG sem alteração SafeMove, CC BY-SA 4.0, Bryl Lim / Workout Guide, pose original Everkinetic / Greg Priday. A fixture acompanha a mesma licença; créditos, licença e alterações anteriores permanecem acessíveis no detalhe real.

Fonte imutável: <https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg>. Licença: <https://creativecommons.org/licenses/by-sa/4.0/>. Download independente e comparação byte a byte com a fonte oficial passaram. O cleanup limita exclusões à conta sintética e aos prefixos Task6.

### Resultados finais observados

| Verificação | Resultado |
| --- | --- |
| API unitários completos | 58 suítes, 737 testes aprovados; exit 0 |
| API tipos/lint | aprovados; runner/cleanup também verificados após suas alterações |
| PostgreSQL completo | 37 suítes, 243 testes aprovados; exit 0 |
| Web completa após correção de foco | 86 arquivos, 655 testes aprovados; tipos/lint aprovados |
| Guard da fixture | 7 testes aprovados; hash e flag/ambiente/ambas as URLs conferidos |
| Helpers do runner/reuso | 13 testes aprovados; quatro defaults, comandos Windows/Linux e rejeição de fontes/config/BUILD_ID alterados |
| Probe oficial separado (20/10) | 20 exercícios, 21 SVGs, cinco grupos; todos HTTP 200 `image/svg+xml`; exit 0 |
| Builds normais após correção de foco | API, Next webpack, TypeScript e postbuild aprovados; fonte atestada acima |
| Bundle do build final | 84 chunks inspecionados; origem/caminho públicos presentes, sem marcadores de catálogo privado, Prisma ou harness |
| Lote de seis specs em 21/10 | 31/32 aprovados; exit 1: visual 3/4 e os outros cinco specs 28/28 |
| Visual corrigido, execução final em 21/10 | 4/4 aprovados; exit 0 em `browser-visual-final.log` |

A evidência final dos seis specs é composta pelos 28 testes de regressão aprovados no lote integrado e pelos quatro visuais aprovados na execução seguinte. O lote de seis não é apresentado como integralmente verde. A única falha desse lote foi um seletor genérico `role=status` que também encontrou os avisos de desvinculação; o seletor final exige o texto visível de rascunho salvo, seu papel status, a URL correta e o botão habilitado. Nenhum comportamento de produto mudou entre essas duas execuções.

O visual final verificou catálogo de 148 itens/filtros, próprios com/sem link, preview sem seleção nem perda de texto, teclado/Escape/retorno de foco, seleção explícita, snapshot resolvido no servidor, rascunho/reload/finalização/reabertura, conflito CAS 409, atualização/exclusão sem reescrever a ficha antiga, renomeação/desvinculação, isolamento da conta B e falha 404 da imagem sem quebrar o texto. A impressão real foi emulada por CDP com o detalhe salvo aberto: overlay e conteúdo do diálogo tiveram `display:none`, enquanto o artigo textual continuou visível. Documento servido com CSP exata/nonce e `Referrer-Policy: no-referrer`; requisição da imagem sem Referer e links próprios sem iframe.

Capturas finais únicas: biblioteca em 1440×900 e detalhe salvo em 390×844, sem overflow horizontal nas asserções. Cópias preservadas em `.superpowers/artifacts/personal-biblioteca-visual/task-6/task6-library-desktop-final.png` e `task6-saved-detail-mobile-final.png`. O coordenador inspecionou os fluxos desktop/mobile. A regressão de foco teve RED reproduzível por consulta adiada, seguida de 14 testes focados e da suíte web completa aprovados.

Limites: a coorte oficial é IMAGE (ilustrações), sem prova de vídeo oficial ou reprodução de YouTube/Vimeo. O probe observa disponibilidade naquele instante e não garante uptime, permanência ou custos futuros; condições da fonte continuam no [runbook de decisões](personal-exercise-media-decisions.md). O teste de navegação por documento observou `bfcacheObserved:false`, portanto não prova restauração por BFCache. Não houve execução Windows, deploy ou migration em produção, envio de dados de aluno ao fornecedor nem avaliação clínica nova neste lote.
