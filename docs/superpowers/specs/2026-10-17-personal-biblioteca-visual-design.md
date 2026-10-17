# Personal — biblioteca visual de exercícios

Data: 17/10/2026. Estado: especificação revisada e aprovada pelo usuário em conversa em 17/10/2026 (“revisei , ta aprovada”).
Direção de produto aprovada em conversa em 17/10/2026, após solicitação de exercícios prontos com fotos/vídeos e alternativa manual.
Base de código: `e33f9c7`; [proposta aprovada e pesquisa de fontes](../../planning/2026-10-17-personal-proxima-entrega.md).

## 1. Resultado esperado e escopo

O Personal encontra exercícios prontos em português, consulta uma demonstração visual e os adiciona à prescrição. Continua podendo digitar um exercício livremente ou salvar um exercício próprio, sem obrigatoriedade de mídia.

Jornada: abrir biblioteca → buscar por nome/grupo/equipamento → ver demonstração → adicionar à ficha → ajustar parâmetros → salvar/finalizar → reabrir a mesma referência de demonstração.

Preservar os 148 exercícios do catálogo atual. A primeira entrega deve associar mídia conferida a pelo menos 20 exercícios desse catálogo, abrangendo peitoral, costas, membros inferiores, ombros e core. Os demais continuam disponíveis com “Demonstração ainda não disponível”. O requisito é foto ou vídeo: vídeo em todos os exercícios não é condição de aceite.

Não importar centenas de nomes em inglês para aumentar a contagem. Expandir o catálogo somente com nome em português, variante identificada e metadados revisados. Não incluir upload de arquivos, busca automática no YouTube, geração de demonstrações por IA, portal de aluno ou contratação de serviço pago nesta entrega.

## 2. Fonte e custo

**Fonte prioritária: wger**, consumido como fornecedor de catálogo/mídia, sem incorporar o código AGPL ao SafeMove. Os dados e mídias têm licenças individuais; guardar origem, autoria e licença de cada item aceito.

Antes de integrar a mídia, verificar em fontes oficiais os termos vigentes do serviço público, autenticação exigida, cotas/limites e permissão de exibição. Usar exclusivamente acesso gratuito compatível com produção. Não cadastrar cobrança, aceitar teste que exige pagamento ou declarar cota ilimitada sem evidência.

Registrar no documento de verificação do lote as URLs oficiais consultadas, data, condições observadas, cobertura e mapa de exercícios aceitos. Aceitar para exibição apenas mídia com autoria/origem identificadas e licença CC0, CC BY ou CC BY-SA em versão identificada, com créditos e obrigações cumpridos. Não adaptar/republicar mídia sem avaliar as obrigações dessa ação. Excluir mídia NC, licença ausente ou origem contraditória.

Se o wger não satisfizer cobertura mínima, licença ou acesso gratuito, não publicar uma biblioteca visual vazia como concluída. Registrar o bloqueio concreto e avaliar o Free Exercise DB como alternativa pelo mesmo critério de proveniência. A declaração Unlicense do repositório não valida por si só a titularidade das fotografias. Uma troca de fonte precisa apresentar a evidência da alternativa antes de adoção; não exige nova aprovação para uma verificação somente de leitura.

Custos de hospedagem e tráfego do próprio SafeMove são distintos do preço da API. Nesta entrega, não criar infraestrutura paga nem copiar arquivos para um armazenamento novo.

## 3. Integração e identidade

Catálogo e IDs `cat-*` permanecem sob controle do SafeMove. Um manifesto versionado na API associa cada ID a uma variante conferida do fornecedor. Não relacionar exercícios somente por tradução ou similaridade de nome: conferir equipamento, variante e movimento; ausência de correspondência confiável fica sem mídia.

O manifesto contém IDs externos, nome original, instrução em português revisada, IDs estáveis dos assets, URL HTTPS de mídia, tipo IMAGE/VIDEO, texto alternativo, sourcePageUrl, autor, nome/URL da licença e identificador de revisão do conjunto. Nenhuma imagem ou vídeo é baixado na requisição clínica. Metadados importados devem respeitar os termos do fornecedor.

A API atende busca e detalhe a partir do catálogo/manifesto local. Não consultar o fornecedor a cada digitação, montar URLs a partir de nomes ou enviar conteúdo do aluno para resolver mídia. A indisponibilidade da API externa não impede a montagem da ficha. Alterações de manifesto são verificadas e versionadas junto ao código; não criar cron de sincronização nesta entrega.

URLs de mídia devem pertencer a hosts oficiais verificados do fornecedor, com HTTPS e caminhos esperados. A lista exata será derivada dos assets aceitos na validação do lote, não de wildcard global. Não criar proxy que faça fetch de URLs fornecidas pelo usuário.

## 4. Persistência e snapshots

### Exercício prescrito

Adicionar ao WorkoutExercise:

- `librarySource`: enum opcional CATALOG ou CUSTOM.
- `libraryExerciseId`: identificador opcional do item selecionado, tratado como referência lógica, não FK que possa apagar uma prescrição.
- `demonstrationSnapshot`: JSON opcional e validado contendo instrução, assets/créditos ou link próprio normalizado e a revisão da fonte. Não aceitar JSON arbitrário do cliente.

O cliente envia somente a referência de biblioteca e a revisão exibida quando há demonstração selecionada. O servidor resolve o snapshot autorizado. Uma nova seleção CATALOG exige ID conhecido; uma nova seleção CUSTOM exige propriedade pela sessão. Revisão de demonstração alterada desde a nova seleção retorna 409 e permite atualizar ou retirar a referência explicitamente.

Nome, séries, repetições e orientações continuam sendo conteúdo da prescrição. Alterar apenas parâmetros não remove a demonstração; editar manualmente o nome desvincula a biblioteca e sua mídia, com aviso simples. Selecionar novamente um item estabelece nova referência. Não manter um vídeo de agachamento em um exercício renomeado como supino.

Alterar catálogo, remover exercício próprio ou atualizar seu link não reescreve fichas finalizadas. O snapshot preserva a referência selecionada, não garante que um servidor externo mantenha o arquivo disponível. Retirada por direitos ou indisponibilidade pode impedir exibição, mantendo o restante da ficha intacto.

Revisar/copiar uma ficha preserva a referência de demonstração salva enquanto a fonte continua autorizada para exibição. Associação explicitamente trocada usa a revisão atual. Registros legados permanecem sem referência; não inferir associação automática por nome.

### Exercício próprio

Adicionar a CustomExercise o campo opcional `videoUrl` e `mediaVersion`, inteiro positivo iniciado em 1. Nesta entrega, aceitar somente links HTTPS de vídeo individual do YouTube ou Vimeo em formatos explicitamente reconhecidos, sem playlists, lives genéricas, encurtadores arbitrários, credenciais ou parâmetros de tracking. Normalizar para URL canônica e identificador do vídeo, limitando entrada a 2048 caracteres.

O Personal continua podendo criar sem vídeo. URL válida não é prova de direitos de uso nem de disponibilidade. Não baixar/republicar vídeo; apresentar link “Abrir vídeo” em nova aba com `noopener noreferrer` e política de referência sem dados do prontuário. Não embutir players de terceiros nesta entrega. Link próprio não se mistura ao catálogo público nem aparece para outro Personal.

### Rascunho

A [entrega de rascunhos](2026-10-17-personal-rascunhos-revisoes-design.md) antecede esta integração. Seu formato passa de schemaVersion 1 para 2, acrescentando referência e snapshot de demonstração validado pelo servidor. Rascunhos v1 continuam legíveis e são convertidos em memória para v2 sem preencher mídia presumida.

O snapshot do rascunho é validado/resolvido pelo serviço, nunca aceito como autoria ou URL arbitrária do corpo HTTP. Para referência e revisão já presentes no rascunho persistido, o servidor reutiliza esse snapshot autorizado, mesmo se o catálogo ou exercício próprio mudar depois. Cópia de ficha obtém o snapshot diretamente da ficha autorizada, não de um objeto enviado pelo cliente. Outras referências são novas seleções e usam o catálogo atual com checagem de revisão. Finalizar conserva o snapshot salvo, sem atualizar sua mídia silenciosamente. Fonte retirada por direitos tem exibição bloqueada, sem alterar o conteúdo histórico.

Uma nova referência que não puder mais ser resolvida permite manter o exercício manual após confirmação, sem descartar os demais campos. O limite de 64 KiB do conteúdo do rascunho inclui esses metadados; excesso é informado sem descartar a elaboração.

## 5. Contratos e telas

Preservar `GET/POST/DELETE /workouts/exercise-library` e seus consumidores. Acrescentar opcionalmente `equipment` ao filtro existente. Adicionar campos de resumo `hasDemonstration` e `demonstrationTypes` sem devolver todos os assets na listagem.

Acrescentar `GET /workouts/exercise-library/:exerciseId` para detalhe de CATALOG ou CUSTOM: item, instruções, revisão e assets/créditos ou link próprio. Validar o formato de ID conforme a fonte; IDs de catálogo não são UUIDs. O endpoint de detalhe é classificado como catálogo, protegido por JWT e PERSONAL; recursos CUSTOM permanecem filtrados pelo dono. Rotas específicas são registradas antes de `GET /workouts/:workoutId`.

DTO de criação de exercício próprio aceita videoUrl opcional. Alteração de links existentes usa `PATCH /workouts/exercise-library/:id` com `{ expectedMediaVersion, videoUrl }`, UUID de CUSTOM e ownership; null remove o link e o campo é obrigatório nessa mutation. Atualizar somente quando a versão esperada corresponder e incrementá-la atomicamente; conflito retorna 409 sem sobrescrita. Não editar catálogo oficial por esse endpoint.

Novos campos da prescrição são retornados nas leituras por ID e do ativo. CreateWorkoutDto e DTOs de rascunho aceitam somente referência explícita, não URL/snapshot bruto. Na gravação, devolver snapshot efetivamente persistido para o editor.

Criar `/exercicios`, exclusiva de PERSONAL, com busca, filtros, diferenciação “SafeMove”/“Meus exercícios”, detalhe e cadastro próprio. Adicionar a entrada “Exercícios” na seção TREINAMENTO quando a página funcionar. “Treinos” fica na mesma seção; demais atuações preservam seus menus.

Reutilizar o detalhe no combobox do editor: “Ver execução” não seleciona o item nem perde os dados digitados. “Adicionar ao treino” conserva nome, grupo e referência; o profissional informa os parâmetros. A ficha salva oferece “Ver execução” para exercícios com snapshot. Link próprio aparece como “Vídeo informado pelo profissional”.

## 6. Exibição, acessibilidade e privacidade

- Imagens com texto alternativo específico; posições inicial/final identificadas quando disponíveis. Carregamento sob demanda e área reservada para evitar saltos de layout.
- Vídeo oficial com controles, sem autoplay ou loop obrigatório, carregado só após ação do usuário. Incluir orientação textual em português; rejeitar demonstração que dependa de fala sem legenda equivalente para sua compreensão.
- Detalhe acessível por teclado, foco contido/restaurado, Escape e alvos de toque de ao menos 44 px. Créditos e link da licença disponíveis no detalhe.
- Mídia ausente/falha mostra “Demonstração indisponível”; não falha a prescrição, não troca automaticamente por uma variante semelhante e não informa que o exercício foi removido.
- Não enviar nome de aluno, clientId, notas ou identificação profissional ao provedor. Requisições diretas ao host da mídia expõem o IP do usuário; usar referrerPolicy no-referrer. Não acrescentar scripts ou analytics do fornecedor.
- Preservar nonce e a CSP atual: ampliar somente img-src/media-src para hosts efetivamente verificados. Não liberar scripts, wildcard HTTPS ou frames para implementar mídia.
- A impressão existente mantém a ficha textual e não imprime player/controles. Documento avançado com QR/link permanece no lote de documentos.

## 7. Cache, segurança e dados

Reutilizar chaves de exercício com `user.sub`, acrescentando filtro de equipamento; detalhe inclui conta e ID. Prescrições e rascunhos continuam sem storage persistente no navegador. Alterar link próprio invalida biblioteca/detalhe da conta e não modifica snapshots finalizados.

CustomExercise mantém RLS por professionalId; as novas colunas de WorkoutExercise herdam proteção do pai. Checar referência CUSTOM no servidor para novas seleções e gravações, inclusive se o cliente mandar ID de outra conta. Preservar snapshot já autorizado do rascunho ou ficha segue a regra anterior, sem exigir que o item de biblioteca ainda exista.

Texto externo é dado, nunca HTML confiável. Normalizar e renderizar texto escapado; não usar HTML do fornecedor diretamente. Links usam protocolos/hosts reconhecidos e não são executados pelo backend. Não adicionar credenciais públicas ou chaves de terceiros ao frontend.

Schema/migration são aditivos: colunas opcionais em WorkoutExercise e CustomExercise, sem alterar conteúdo legado. Os arquivos protegidos exigem revisão pelo AGENTS.md, seção 8. Nenhum arquivo protegido é alterado nesta especificação.

## 8. Critérios de aceite

1. Os 148 itens existentes continuam selecionáveis; ao menos 20 possuem demonstração conferida e créditos/licença verificáveis, nos grupos indicados.
2. Barra/halteres/máquina e demais variantes não compartilham mídia por aproximação textual. Mapa de associação revisado contém IDs das duas fontes.
3. Catálogo e busca funcionam sem requisição externa de metadados. Falha de arquivo externo afeta somente sua demonstração.
4. Selecionar → prescrever → salvar/finalizar → reabrir mantém referência e parâmetros. Atualização de catálogo/link próprio não altera ficha salva.
5. Exercício manual funciona sem mídia; renomear item selecionado remove o vínculo com aviso; trocar referência é explícito.
6. Criar exercício próprio com/sem link, normalizar URL, conflito de alteração, excluir item e reabrir ficha anterior funcionam sem alterar snapshot.
7. IDs de outra conta, URLs inválidas, scripts, HTML externo e snapshots forjados são rejeitados. Nutrição/Fisioterapia não montam a página ou suas consultas.
8. E2E real de biblioteca/seleção/persistência com banco sintético e sem mocks dos serviços principais. Mídia usada no E2E deve ser fixture licenciada controlada pelo teste; disponibilidade do fornecedor é verificada separadamente e registrada, sem tornar a suíte dependente do seu uptime.
9. Testes de referência/snapshot/legado, validação de URLs, RLS, cache e CSP; tipos, lint e builds afetados; inspeção final desktop/celular, teclado e falha de mídia.

## 9. Revisão e sequência

Autorrevisão: escopo limitado a biblioteca/demonstração e sua referência na prescrição; exclusão de upload e embeds reduz dependências; cobertura mínima, legado, vínculo manual, licença, falha externa e snapshots definidos. A decisão de wger é condicionada a evidência oficial de acesso e mídia compatíveis; não representa verificação já concluída desses pontos.

Preparar e apresentar o [plano técnico do lote](../plans/2026-10-17-personal-biblioteca-visual.md) para revisão e escolha do método de execução. Modelos independentes, documentos e acompanhamento permanecem entregas seguintes da proposta aprovada. Esta etapa documental não declara execução de testes, integração com provedor ou deploy.
