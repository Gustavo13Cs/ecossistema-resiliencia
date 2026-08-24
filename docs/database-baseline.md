# Database Migration Baseline

## Contexto

Em 2026-08-13 a cadeia de migrations foi reconstruída em uma única migration `baseline`
(`20260813000000_baseline`) que descreve o estado completo do banco naquele momento.
A migration seguinte (`20260813120000_add_agenda_core`) adiciona os 4 novos modelos da
feature de agenda diária integrada.
A terceira migration (`20260821190000_add_client_foundation`) cria a base privada de
`Client` por profissional, com status ativo/arquivado, índice de listagem, unicidade de
e-mail por proprietário e eventos de auditoria do ciclo de vida.

## Estratégia de startup automático (docker-compose)

O container da API executa, na ordem, uma lógica que funciona para **todos os cenários**:

```sh
# Tenta aplicar as migrations normalmente.
# Em banco NOVO → roda as 3 migrations em ordem → OK
# Em banco EXISTENTE com tabelas antigas → falha (tabelas já existem) → vai pro fallback
npx prisma migrate deploy || (
  # Fallback para banco de produção com tabelas antigas sem histórico Prisma:
  # marca o baseline como "já aplicado" e faz deploy novamente.
  npx prisma migrate resolve --applied 20260813000000_baseline &&
  npx prisma migrate deploy
)
node dist/src/main.js
```

### Por que "deploy primeiro"?

| Cenário | O que acontece |
|---|---|
| **Banco novo** (Docker dev/CI) | `deploy` cria tudo (baseline + agenda + foundation de clientes) → OK |
| **Banco existente** (produção, tabelas já existem) | `deploy` falha no baseline → fallback: resolve + deploy novamente → aplica as migrations incrementais pendentes → OK |
| **Banco já migrado** (tem as três no histórico) | `deploy` não tem nada a fazer → sai com 0 → OK |

## Banco de testes e2e (porta 5434)

Os testes e2e usam um banco separado (`ecossistema_resiliencia_test`) isolado do banco
principal. Suba-o com:

```sh
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
DIRECT_URL=postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test \
  npx prisma migrate deploy
npm run test:e2e
docker compose -f docker-compose.test.yml down -v
```

O GitHub Actions CI executa esse fluxo automaticamente em cada push/PR.

## Adicionar uma nova migration no futuro

```sh
# Com o banco local rodando (porta 5434 ou outra):
npx prisma migrate dev --name descricao_da_mudanca
```

Isso gera uma nova migration incremental. Nenhuma mudança na estratégia de baseline
é necessária.
