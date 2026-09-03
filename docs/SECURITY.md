# Segurança — SafeMove

> Modelo de segurança do SafeMove. Todo agente ou desenvolvedor que toque em
> autenticação, autorização ou dados clínicos **deve** ler este documento.

---

## 1. Autenticação

### Fluxo

```
┌─────────┐    POST /auth/login     ┌──────────┐
│ Browser │ ──────────────────────→  │  NestJS  │
│         │  { email, password }    │          │
│         │ ←──────────────────────  │          │
│         │  Set-Cookie: access_token│          │
│         │  (HttpOnly, Secure)     │          │
└─────────┘                         └──────────┘
```

### Implementação

| Componente        | Localização                                |
|-------------------|--------------------------------------------|
| Login/Register    | `api/src/modules/auth/auth.controller.ts`  |
| JWT Strategy      | `api/src/common/strategies/jwt.strategy.ts`|
| Auth Guard        | `api/src/common/guards/`                   |
| Auth Context (FE) | `web/contexts/auth-context.tsx`            |

### Regras

- **Senhas**: hashadas com **bcrypt** (12 salt rounds)
- **Token**: JWT com payload `{ sub: userId, role: userRole }`
- **Armazenamento**: cookie `HttpOnly` + `Secure` + `SameSite=Lax`
- **Expiração**: configurável via `JWT_SECRET` no `.env`
- **Renovação**: não implementada (sessão única por login)

---

## 2. Autorização

### Camadas

```
Request → ThrottlerGuard → JwtAuthGuard → @Roles() → ClientAccessGuard → Controller
```

1. **ThrottlerGuard** (global): 20 req/min por IP — `ThrottlerModule` no `app.module.ts`
2. **JwtAuthGuard** (global): exige token válido em toda rota
   - Rotas públicas: marcadas com `@Public()` decorator
3. **@Roles() decorator**: restringe por role (`NUTRITIONIST`, `PERSONAL`, `PHYSIO`)
4. **ClientAccessGuard**: verifica que `Client.professionalId === req.user.id`

### Roles

| Role           | Permissões                                     |
|----------------|------------------------------------------------|
| `NUTRITIONIST` | Dietas, alimentos, suplementos, exames lab     |
| `PERSONAL`     | Treinos, avaliações físicas, alertas           |
| `PHYSIO`       | Avaliações fisio, planos reabilitação          |
| `ADMIN`        | Todas (reservado, não usado em produção)       |
| `PATIENT`      | Legado — acesso limitado a dados próprios      |

---

## 3. Isolamento de Dados

### Princípio
> Cada profissional vê **somente** seus próprios prontuários. Recurso de outro
> profissional é tratado como **não encontrado** (404), não como **proibido** (403).

### Implementação

```typescript
// Em qualquer service que toque Client:
async findOne(id: string, professionalId: string) {
  const client = await this.prisma.client.findFirst({
    where: { id, professionalId }, // SEMPRE filtra por owner
  });
  if (!client) throw new NotFoundException();
  return client;
}
```

### Checklist para novos endpoints

- [ ] O endpoint filtra por `professionalId` derivado do JWT?
- [ ] O `ClientAccessGuard` está aplicado nas rotas de Client?
- [ ] O endpoint retorna 404 (não 403) para recursos de outro profissional?
- [ ] Logs e erros NÃO contêm dados clínicos do prontuário?

---

## 4. Validação de Input

### Backend

- **class-validator**: decorators nos DTOs (`@IsString()`, `@IsEmail()`, `@Min()`, etc.)
- **class-transformer**: `plainToInstance()` para sanitização
- **ValidationPipe** (global): configurado no `main.ts` com `whitelist: true`
  - Remove propriedades não declaradas no DTO (proteção contra mass assignment)

### Frontend

- **Zod**: schemas de validação para forms
- **React Hook Form**: integração com Zod via `zodResolver`

---

## 5. Proteção contra Ataques Comuns

| Ameaça              | Mitigação                                           |
|---------------------|-----------------------------------------------------|
| SQL Injection       | Prisma ORM (prepared statements automáticos)        |
| XSS                 | JWT em HttpOnly cookie (JS não acessa o token)      |
| CSRF                | `SameSite=Lax` no cookie                            |
| Brute Force         | Rate limiting: 20 req/min por IP                    |
| Mass Assignment     | `whitelist: true` no ValidationPipe                 |
| Data Leakage        | Isolamento por `professionalId` em todo query       |
| Privilege Escalation| `@Roles()` guard + verificação de ownership         |

---

## 6. Dados Sensíveis

### O que é sensível

- Dados clínicos (anamnese, exames, avaliações, prescrições)
- Dados pessoais (nome, email, telefone, data de nascimento)
- Notas do profissional (`professionalNotes`, `privacyNotes`)
- Credenciais (senhas hashadas, JWT secret)

### Regras de manuseio

1. **NUNCA** logar dados clínicos em plaintext
2. **NUNCA** retornar senha (mesmo hashada) em responses
3. **NUNCA** armazenar dados clínicos em localStorage/sessionStorage
4. **NUNCA** incluir dados sensíveis em URLs (query params)
5. **NUNCA** commitar `.env` ou `.env.local`

---

## 7. Variáveis de Ambiente

| Variável            | Onde          | Descrição                        | Sensível? |
|---------------------|---------------|----------------------------------|-----------|
| `DATABASE_URL`      | `api/.env`    | Connection string PostgreSQL     | ✅ Sim     |
| `DIRECT_URL`        | `api/.env`    | Direct connection (sem pooling)  | ✅ Sim     |
| `JWT_SECRET`        | `api/.env`    | Chave de assinatura JWT          | ✅ Sim     |
| `ALLOWED_ORIGINS`   | `api/.env`    | CORS origins permitidos          | ❌ Não     |
| `NODE_ENV`          | `api/.env`    | development / production         | ❌ Não     |
| `NEXT_PUBLIC_API_URL`| `web/.env.local`| URL da API                    | ❌ Não     |
