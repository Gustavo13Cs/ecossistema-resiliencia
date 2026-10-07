# Continuação da remediação de segurança

**Objetivo:** fechar DR-001/002/003 com testes de ataque e de uso legítimo, e preparar as mudanças estruturais de auditoria e isolamento para revisão.

**Base:** `934e183`. Worktree: `.worktrees/security/security-followup`; branch: `agent/codex/security-followup`.

**Autorização:** o mantenedor solicitou continuar o plano discutido no chat. Implementação local e validações isoladas autorizadas; deploy, rotação real, schema e migrations novos serão apresentados em proposta concreta.

## Invariantes

- Nenhuma entrada HTTP pode fornecer gramática Prisma, identidade do proprietário ou relações para atualizar Food.
- Origem oficial não pode ser criada, alterada ou removida por conta comum.
- Food é um catálogo compartilhado sem proprietário: alimento já relacionado a qualquer dieta/modelo/receita fica imutável. Alterações devem usar um novo alimento; não se reescreve a história clínica.
- A checagem de referências e a atualização/exclusão precisam ser serializadas com criação de novas referências, sem janela de verificação seguida de escrita.
- Preferência é sempre lida pela identidade autenticada, com compatibilidade somente para a query legada que coincida com essa identidade.
- Dados reais, segredos, produção e guards não serão usados para viabilizar testes.

## Execução e critérios

- [x] Gerar Prisma atual e verificar baseline (unitários/tipos).
- [x] Escrever e observar falhas de regressões HTTP: escrita aninhada, escalares inválidos, origem oficial, preferência de outra conta; incluir controles legítimos.
- [x] Implementar DTO concreto, allowlist de escalares e autorização da origem/referências no serviço.
- [x] Exercitar integridade de dietas e receitas com PostgreSQL sintético e dois profissionais, inclusive a concorrência com novas referências.
- [x] Atualizar os consumidores reais para identidade da sessão e mensagens claras sobre imutabilidade.
- [x] Validar tipos/lint/build, unitários e E2E relevantes; fazer revisão independente do patch.
- [x] Atualizar avaliação de dependências e metadados operacionais, sem mudanças remotas.
- [x] Preparar proposta concreta de auditoria de leitura, políticas por profissional e papel da conexão da API para revisão dos arquivos protegidos.

## Decisões e evidências

- Food MANUAL ainda é compartilhado. Não atribuir dono a registros históricos sem prova.
- Cliente Prisma instalado era anterior ao schema atual; baseline inicial falhou por enums/campos ausentes. Regeneração necessária antes de classificar falhas do código.
- Docker iniciado para o banco sintético; após a pausa o daemon precisou ser restabelecido. A validação mantém a porta 5434 e nenhuma conexão com produção.
- A auditoria de leitura precisa de ações e persistência próprias; não reutilizar UPDATED para representar consultas.

## Revisão

Checar objetos de operação Prisma nos escalares, null/zero/strings numéricas, origem persistida versus fornecida, vínculos de receitas além de MealItem, atualização/exclusão concorrente e compatibilidade das duas UIs.

## Progresso de validação em 2026-10-05

- Baseline API: 45 suítes/472 testes e tipos aprovados. As regressões HTTP observaram 22 falhas antes da correção e 24/24 testes passaram depois.
- Docker foi restabelecido; migrations existentes aplicadas somente ao PostgreSQL sintético na porta 5434. A fixture nova usa banco descartável do helper `isolatedPostgres`, sem desabilitar triggers de versões imutáveis.
- Revisão independente identificou janela entre leitura/cálculo de alimentos e inserção de ingredientes. Regressão PostgreSQL com barreira reproduziu a falha; FOR SHARE antes da leitura fechou a janela e o teste passou.
- Junções de node_modules removidas sem excluir destinos; npm ci instalou dependências próprias de cada lockfile. Build Turbopack padrão validado com Next.js 16.3.8.
- npm audit --omit=dev API/web: zero avisos conhecidos no lockfile. Metadados remotos: 40 tabelas com RLS, 40 deny_data_api_access, zero FORCE RLS; postgres tem BYPASSRLS; advisor de segurança sem avisos.
- Proposta de leitura/RLS salva como artefato persistente Codex Security; nenhuma alteração de schema, migration nova, configuração de credencial ou produção.

## Conclusão local e próxima aprovação

Todos os critérios desta etapa foram atendidos: API 472 unitários e 150 E2E (36 regressões Food), web 388 testes, tipos/lint/builds e 28 páginas com CSP aprovados. Nenhum timeout aumentado ou teste suprimido. A corrida de receita foi corrigida após a revisão independente e validada; não houve uma segunda revisão independente. Cypress não foi reexecutado nesta etapa.

Audit runtime sem avisos conhecidos; audit completo ainda lista 29 entradas high na API e 18 entradas na web (4 moderate/12 high/2 critical, incluindo o mesmo advisory Vitest em dois pacotes). A atualização de ferramentas é pendência própria; manifests/lockfiles intactos. Scripts demo/seed ainda exigem endurecimento; não foram executados e credenciais não foram expostas.

Proposta e evidência persistentes estão vinculadas no CODEX_STATUS.md. Próxima etapa: aprovação explícita do mantenedor para novos schema/migrations de auditoria de leitura/RLS, conforme AGENTS.md seção 8. Esta conclusão não aplica código em main nem produção e não atesta backup/restauração ou role efetiva do processo publicado.
