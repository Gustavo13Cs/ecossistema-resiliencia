# Performance 02 — imagens responsivas em AVIF/WebP

## Resultado

Na branch `agent/codex/performance-diagnosis`, commit funcional `dc27372`, o Next/Image passou a entregar a logomarca em **AVIF**, com **WebP** e **PNG redimensionado** como alternativas conforme o `Accept` do navegador. Comparação contra `d9d08ac`: **97,86% a 99,68% menos bytes de imagens**, nos 12 cenários medidos. Tamanhos CSS preservados, variantes correspondentes a 1×/2×/3× e CLS observado igual a zero antes/depois.

A alteração tem seis arquivos e não modifica os PNGs originais, ícones, ilustrações de exercícios, dependências, API, banco, RLS ou autenticação. Código e evidências publicados na mesma branch; não houve promoção de deployment de produção nesta etapa.

## Auditoria e decisão

`web/public/logo.png` tem **512×512 px, transparência e 248.272 bytes**. Era servido integralmente nas sete ocorrências de Next/Image, embora a marca apareça a **20, 24, 32 ou 36 px CSS**. `images.unoptimized: true` impedia a geração de variantes e negociação de formato.

- **Pipeline existente:** Next.js 16.3.8, frontend Vercel e saída standalone. Sharp já é dependência de produção; nenhum pacote foi instalado no projeto. A documentação da versão instalada foi consultada e o artefato standalone foi executado isoladamente fora do checkout, sem depender do `node_modules` do repositório.
- **Formato:** AVIF é preferido, seguido de WebP. Na verificação real de 108×108 px/qualidade 85, AVIF ficou em **3.220 bytes**, WebP em **6.212 bytes**. Em 20 px, WebP ficou ligeiramente menor (722 contra 758 bytes), mas AVIF venceu nos demais tamanhos testados.
- **Qualidade:** começou em 75; a configuração final usa somente **85** para priorizar os contornos da marca. Nas nove comparações de crops renderizados, a diferença de pixels em relação ao PNG original diminuiu. O ensaio anterior foi preservado em [quality75-reference.json](evidence/performance-02/quality75-reference.json).
- **Dimensões:** `sizes` informa o tamanho CSS fixo nas sete imagens. `imageSizes` acrescenta as variantes necessárias para densidades 1×/2×/3×, conservando os tamanhos padrão do Next. Por exemplo, a marca de 36 px recebe 36/72/108 px, em vez de 512 px.
- **Segurança:** o otimizador aceita somente `/logo.png`, sem query string. Não foram habilitadas fontes remotas, SVG ou IPs locais. Queries de API não podem ser encaminhadas por esse endpoint. CSP, permissões e política de mídia permanecem iguais.

[Inventário de assets](evidence/performance-02/assets-before.json) também registra ícones PNG de 180/192 px e três placeholders com extensão de imagem que contêm texto. Os placeholders não são referenciados pelas telas auditadas; ficaram preservados. Ícones de aplicação/favicon mantêm os formatos de suas convenções. As ilustrações externas continuam como SVG/imagem original, com allowlist, autoria, licença e `no-referrer`; seu componente proíbe o uso do otimizador e foi preservado.

## Método repetível

Chromium real no ambiente local, com viewports emulados **1440×900/DPR1**, **1440×900/DPR2** e **390×844/DPR3**. Quatro rotas em cada configuração: inicial, login, cadastro e clientes. **12 capturas antes e 12 depois**, com contextos novos e cache do navegador desativado. As páginas públicas simulam ausência de sessão; a área privada usa sessão e APIs sintéticas interceptadas no browser. Não houve consulta ou escrita em produção.

A métrica principal é a soma do **corpo das respostas de imagens efetivamente solicitadas**, antes de scroll. São bytes recebidos e decodificados, não estimativas a partir do tamanho do arquivo. O inventário também registra `encodedBodySize`, formato decodificado, dimensões físicas, tamanho CSS, densidade, cache e URL selecionada. Imagens lazy fora do viewport não são forçadas a carregar; a abertura do menu faz parte do cenário de clientes no celular. Favicons/metadados não integram essa contagem de imagens da interface.

Evidências: [antes](evidence/performance-02/before.json), [depois](evidence/performance-02/after.json), [comparativo e pixels](evidence/performance-02/comparison.json).

## Antes × depois

O valor anterior em todas as linhas foi **248.272 bytes / 242,45 KiB**. KiB = 1.024 bytes.

| Tela | Viewport / densidade | Depois, bytes | Depois, KiB | Redução | Requests de imagem antes → depois |
|---|---|---:|---:|---:|---:|
| Inicial | Desktop 1× | 1.763 | 1,72 | 99,29% | 1 → 2 |
| Login | Desktop 1× | 1.164 | 1,14 | 99,53% | 1 → 1 |
| Cadastro | Desktop 1× | 799 | 0,78 | 99,68% | 1 → 1 |
| Clientes/sidebar | Desktop 1× | 1.164 | 1,14 | 99,53% | 1 → 1 |
| Inicial | Desktop 2× | 3.088 | 3,02 | 98,76% | 1 → 2 |
| Login | Desktop 2× | 2.092 | 2,04 | 99,16% | 1 → 1 |
| Cadastro | Desktop 2× | 1.404 | 1,37 | 99,43% | 1 → 1 |
| Clientes/sidebar | Desktop 2× | 2.092 | 2,04 | 99,16% | 1 → 1 |
| Inicial | Celular 3× | 2.952 | 2,88 | 98,81% | 1 → 1 |
| Login | Celular 3× | 5.312 | 5,19 | 97,86% | 1 → 2 |
| Cadastro | Celular 3× | 2.092 | 2,04 | 99,16% | 1 → 1 |
| Clientes/menu | Celular 3× | 3.220 | 3,14 | 98,70% | 1 → 1 |

Na inicial desktop, cabeçalho e rodapé passam a usar variantes distintas. No login mobile, o preload existente da marca lateral e a marca mobile solicitam variantes diferentes. O ensaio contabiliza esses downloads extras: mesmo o pior caso fica em 5,19 KiB, contra 242,45 KiB. As condições de preload/lazy loading existentes foram preservadas; não houve refatoração do layout ou da navegação.

A redução se refere às imagens, não ao JavaScript, API, duração total de tela ou salvamento. Os tempos locais de recurso/LCP foram arquivados como diagnóstico, sem amostras suficientes ou rede de produção para atribuir ganho de latência. Lighthouse e RUM não foram executados nesta etapa.

## Nitidez, transparência e carregamento

- Todos os logos no viewport terminaram de decodificar, sem imagem quebrada ou erro JavaScript não tratado. As variantes AVIF/WebP têm alpha RGBA; o fallback PNG usa paleta com transparência preservada.
- A largura entregue foi conferida como **largura CSS × DPR** em todos os logos visíveis, nas três densidades. Os tamanhos CSS antes/depois coincidem. CLS observado **0 → 0 nos 12 cenários**.
- Foram registrados nove pares de crops do próprio navegador, em fundos claro/escuro e densidades distintas. A inspeção dos exemplos abaixo confirmou a marca completa, contornos legíveis e fundo transparente. Há compressão com perdas; o PNG fonte permanece intacto.
- A comparação de screenshots mede PSNR de **24,23 a 28,91 dB** na configuração final. O aumento de qualidade 75→85 melhorou o indicador em todos os nove pares; ele também reflete a diferença entre reamostragem do Chromium e do Sharp e não é uma medida isolada de nitidez.

| Exemplo | Antes | Depois |
|---|---|---|
| Marca de 32 px, celular 3× | [crop PNG](evidence/performance-02/before-mobile-3x-landing.png) | [crop AVIF](evidence/performance-02/after-mobile-3x-landing.png) |
| Marca de 36 px, fundo escuro, desktop 2× | [crop PNG](evidence/performance-02/before-desktop-2x-auth-login.png) | [crop AVIF](evidence/performance-02/after-desktop-2x-auth-login.png) |

## Arquivos alterados e verificações

| Arquivo | Alteração |
|---|---|
| `web/next.config.mjs` | Ativa otimização, AVIF/WebP, qualidade 85, larguras da marca e allowlist local estrita. |
| `web/app/page.tsx` | `sizes` de 32 px no cabeçalho e 20 px no rodapé. |
| `web/app/auth/login/page.tsx` | `sizes` de 36 px na lateral e 24 px no mobile. |
| `web/app/auth/register/page.tsx` | `sizes` de 24 px. |
| `web/components/layout/ProfessionalSidebar.tsx` | `sizes` de 36 px. |
| `web/components/layout/MobileNavigation.tsx` | `sizes` de 36 px. |

Demais arquivos: este runbook, evidências e status/backlog. Nenhuma nova biblioteca, migration ou arquivo de imagem da aplicação foi criado, convertido ou apagado.

- Build final, TypeScript e lint: aprovados. Pós-build confirmou **32/32 páginas** e runtime standalone sem pacotes de desenvolvimento/arquivos de ambiente.
- Suíte final: **773/773 testes, 99 arquivos**, incluindo autenticação, navegação, mídia de exercícios e contratos das telas.
- Otimizador real: **22 combinações** (11 larguras × AVIF/WebP), fallback PNG transparente e **seis bloqueios HTTP 400**: API local, URL externa, query não permitida, SVG, largura não permitida e qualidade não permitida. Evidência: [optimizer.json](evidence/performance-02/optimizer.json).
- Artefato standalone copiado para um diretório temporário fora do checkout: as mesmas 22 combinações, fallback e seis bloqueios passaram, comprovando a inclusão do Sharp e binários necessários. Evidência: [standalone-optimizer.json](evidence/performance-02/standalone-optimizer.json).
- Fonte PNG, ícones, dependências, backend, proxy/CSP e política de mídia comparados ao baseline: sem alterações. `git diff --check` aprovado.

## Limites operacionais e rollback

A primeira transformação tem custo de CPU; resultados seguintes usam cache com `Vary: Accept`. No standalone local, requests iniciais AVIF mediram aproximadamente 22–106 ms, incluindo HTTP local e inicialização; não representam latência de produção. O cache de imagens e o suporte nativo de otimização já são oferecidos pela Vercel, mas passam a consumir sua cota de Image Optimization; cobrança e saldo não foram medidos. Em hospedagem própria, manter Sharp e permitir escrita no cache do Next. Esse runtime standalone local foi validado; a imagem Docker não foi reconstruída nesta rodada.

A marca fonte é estável e pública. Ao trocar a marca futuramente, versionar seu caminho e atualizar a allowlist, ou invalidar o cache aplicável. Os PNGs originais e URLs convencionais dos ícones continuam disponíveis.

Rollback: reverter **`dc27372`** e gerar novo build. Isso restaura `unoptimized: true` e as props anteriores. Não envolve SQL, dados ou configuração externa de produção.

## Reprodução e conferência manual

1. Em `web`, executar `NEXT_PUBLIC_API_URL=http://localhost:3000 npm run build`. Iniciar em porta 3102 com `NEXT_PUBLIC_API_URL=http://localhost:3000 npm start -- --hostname 127.0.0.1 --port 3102`. O aviso de `next start` com standalone é conhecido; a verificação do artefato isolado usa `node server.js`.
2. Na raiz, executar `python docs/runbooks/evidence/performance-02/measure-images.py --phase after --output /tmp/perf02-after.json`. Requer Python/Pillow/Playwright e Chromium disponíveis no ambiente; não são dependências novas do app. Para o baseline, conservar o runner fora do checkout e usar `--phase before` contra o build antigo.
3. Executar `python docs/runbooks/evidence/performance-02/verify-image-optimizer.py`. Para um standalone local em outra porta: `PERF02_IMAGE_ORIGIN=http://127.0.0.1:3103 PERF02_RESULT_FILE=standalone-optimizer.json python docs/runbooks/evidence/performance-02/verify-image-optimizer.py`. O runner recusa origins fora de localhost.
4. No navegador, abrir inicial, login e cadastro em desktop e celular. Conferir contorno/fundo da marca e ausência de deslocamento. Na área privada, abrir Clientes e o menu mobile.
5. Em Network, desativar cache e filtrar imagens. Conferir `/_next/image`, `Content-Type: image/avif` ou WebP e largura compatível com o tamanho exibido/densidade. Acessos sem suporte aos dois formatos devem receber PNG redimensionado.
6. Abrir uma demonstração de exercício autorizada para confirmar a mídia original e os créditos. Não usar prontuários reais como carga de teste. Login e formulários permanecem cobertos pelos testes; não houve uso de sessão clínica real em produção.
