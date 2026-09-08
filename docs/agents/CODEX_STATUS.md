# Codex — status

- Em andamento: Task 8, autorização de domínios profissionais na API.
- Task 7 aprovada nos commits `136f314..8855095`: prontuário `Client` isolado por profissão, remoção da persistência clínica legada e três gaps da revisão independente corrigidos.
- Worktree: `.worktrees/safemove-professional-frontend-phase-1`
- Branch: `codex/safemove-professional-frontend-phase-1`
- Gates finais do fix round: 148/148 testes frontend, typecheck, lint, detector Impeccable limpo, build de produção e contrato de direção 12/12 aprovados.
- Próximo gate: política imutável de papéis por domínio, guards JWT/Roles em todos os controllers clínicos e E2E de 403 por profissão.
- Nenhuma captura de tela ou execução Cypress foi feita na Task 7, conforme a diretriz de validação visual; Task 9 mantém a responsabilidade pelo E2E real determinístico.
- Rotas clínicas antigas fora do novo prontuário ainda usam identidade `User` e permanecem explicitamente fora da afirmação de migração até as próximas etapas.
