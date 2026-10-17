# Correções das revisões dos PRs 27 e 28

Base: `e33f9c7`, ambos PRs integrados. Revisões consultadas nos chats “Revisar PR 27 do SafeMove” e “Revisar PR 28 em privado”. O PR 28 não apontou defeitos; solicitou validar a suíte API.

## Correções

1. **Prescrição não salva:** distinguir falha inicial de falha na atualização de contexto já carregado. Falhas transitórias do prontuário ou treino ativo mantêm o editor montado, exibem recuperação e bloqueiam edição/envio até recuperar o contexto. O submit também verifica o bloqueio. 401/403 continuam ocultando o editor; a chave por profissional/aluno continua isolando o formulário.
2. **Histórico após salvar avaliação:** `useCreateClientAssessment` contém a mutation e as invalidações por profissional/aluno. O diálogo usa somente essa mutation, sem registrar um observador de leitura desabilitado capaz de substituir a queryFn compartilhada durante o POST.
3. **Reautenticação:** as cinco telas usam `ReauthenticateButton`, que chama o logout existente. O fluxo limpa sessão/cache e navega para `/auth/login`, inclusive quando o endpoint de logout falha. Nenhuma nova regra de autorização foi introduzida.

## Evidências e ambiente

- Antes das correções, quatro cenários novos falharam: preservação após recarga de treino, preservação após recarga do prontuário, atualização do histórico durante POST pendente e logout acionado pela recuperação de acesso.
- Após as correções: 38/38 testes focados de contratos de treino, diálogo, histórico, hooks e reautenticação com AuthProvider real.
- Revisão independente do diff não identificou novos defeitos acionáveis.
- A execução em UTC revelou dependência preexistente do fuso brasileiro em `useFollowUps.test.ts` (consulta hoje) e `usePersonalDayAgenda.test.tsx` (virada do dia, retorno à aba e atualização manual). Os arquivos permanecem intactos; a suíte é validada com `TZ=America/Fortaleza`.
- Três verificações de stdout em `scripts/assert-standalone-runtime.test.mjs` falharam sob o sandbox padrão. A reprodução mínima com `spawnSync(node, ["-e", "console.log(123)"])` retornou `error.code=EPERM`, status 0 e stdout vazio. A execução com a permissão de rede do sandbox removeu o EPERM e capturou stdout normalmente, sem modificar scripts/testes.
- Antes da recriação do ambiente, 602 testes API, tipos/lint e ambos builds passaram. Validação final no ambiente restaurado em andamento.

## Limites

Testes de componentes/hooks usam HTTP simulado e QueryClient real. Nenhuma migration, banco de produção ou deploy. O escopo API é a suíte Jest unitária/HTTP com banco simulado; E2E PostgreSQL não foi executado nesta tarefa.
