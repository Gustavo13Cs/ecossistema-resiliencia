# Database Migration Baseline

## Contexto

Em 2026-08-13 a cadeia de migrations foi reconstruída em uma única migration `baseline`
(`20260813000000_baseline`) que descreve o estado completo do banco naquele momento.
A migration seguinte (`20260813120000_add_agenda_core`) adiciona os 4 novos modelos da
feature de agenda diária integrada.

## Estratégia de startup automático (docker-compose)

O container da API executa, na ordem:

```sh
# 1. Marca o baseline como "já aplicado" em bancos que já existiam.
#    Em bancos novos o comando falha silenciosamente (|| true).
npx prisma migrate resolve --applied 20260813000000_baseline || true

# 2. Aplica apenas as migrations ainda não registradas no banco.
npx prisma migrate deploy

# 3. Sobe a aplicação.
node dist/src/main.js
```

### Por que `|| true`?

- **Banco novo (CI / dev)**: `migrate resolve` falha porque o baseline ainda não está
  registrado na tabela `_prisma_migrations`. O `|| true` ignora esse erro e o passo 2
  aplica baseline + add_agenda_core normalmente.
- **Banco existente (produção)**: `migrate resolve` marca o baseline como aplicado.
  O passo 2 aplica apenas `add_agenda_core` (as tabelas novas de agenda).
- **Banco já migrado**: se o baseline já foi marcado, `migrate resolve` é idempotente.

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
