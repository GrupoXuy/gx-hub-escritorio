# Auditoria — GX Hub Escritório

**Data:** 2026-09-12
**Base auditada:** commit `95f33c4` (`main`), branch `arena/01a09741-gx-hub-escritorio`
**Método:** leitura estática do código + **reprodução executada contra PostgreSQL real** (PGlite 0.5.8 / PostgreSQL 18.3 servido no protocolo de wire, app Next.js 16.2.6 apontado para ele)

Diferente de uma auditoria só estática: todos os achados de severidade **crítica** e **alta** abaixo foram reproduzidos de fato — requisições HTTP reais contra um banco real — antes e depois da correção.

---

## Resumo

| # | Severidade | Achado | Status |
|---|---|---|---|
| 1 | **Crítica** | Senha do administrador redefinida para o padrão em **todo cold start** | ✅ Corrigido |
| 2 | **Crítica** | Senha real do administrador **commitada em repositório público** | ✅ Removida do código · ⚠️ **rotacionar obrigatório** |
| 3 | **Alta** | Email tratado como **padrão SQL `LIKE`** → login por curinga e takeover do admin | ✅ Corrigido |
| 4 | Média | Sem limitação de tentativas nos endpoints de autenticação | ✅ Corrigido |
| 5 | Média | Cookie de sessão sem flag `Secure` | ✅ Corrigido |
| 6 | Baixa | `GX_ADMIN_INITIAL_PASSWORD` documentada mas **não implementada** | ✅ Implementada |
| 7 | Baixa | `GX_TEST_BASE_URL` (Playwright) vs `TEST_BASE_URL` (scripts) | ✅ Unificado |
| 8 | Baixa | `cleanupTestData()` apagava usuários reais por prefixo de nome | ✅ Corrigido |
| 9 | Info | `/api/auth/password` não troca senha — era um segundo endpoint de login | ✅ Consolidado |
| 10 | Info | Hook `login()` morto (enviava `{userId}` para uma rota que lê `{email}`) | ✅ Removido |

---

## Achado 1 — Crítica: senha do admin redefinida a cada cold start

**Evidência (antes):** `src/lib/server.ts:11`, `:133`, `:148`

```ts
const HENRIQUE_DEFAULT_PASSWORD = "255914Lh@";          // :11
...
const passwordHash = await bcrypt.hash(HENRIQUE_DEFAULT_PASSWORD, 10);   // :133
...
if (!existing.passwordHash || existing.passwordHash !== passwordHash)    // :148
  patch.passwordHash = passwordHash;
```

**Causa:** `bcrypt.hash()` sorteia um **salt novo a cada chamada**, portanto dois hashes da mesma senha nunca são iguais. A condição da linha 148 é **sempre verdadeira** — ela nunca "detecta alteração", ela apenas reescreve a senha.

Verificado empiricamente:

```
hash#1: $2b$10$M9Wi2UrhsNZEsWK4cTSAF.JQK.LNSdjlw22OUv3qp89CjOmW7PPIW
hash#2: $2b$10$a3CcueKW1nWoRT19frG9COMk2WhY9LIrdZmyvH.hwZUj17AxofofO
iguais? false          ambos verificam? true true
```

**Reprodução (antes da correção), contra PostgreSQL real:**

| Passo | Resultado |
|---|---|
| Login com a senha padrão | `200` — Henrique Senna, `isAdmin: true` |
| Trocar senha pela interface (`PATCH /api/auth/credentials`) | `200` — hash novo gravado e confirmado no banco |
| **Reiniciar o app (cold start)** | — |
| Login com a senha **nova** | `401 — Email ou senha incorretos.` |
| Login com a senha **padrão** | `200` — entrou como administrador |

**Impacto:** a senha escolhida pelo administrador **nunca persiste**. Em ambiente serverless isso significa "em qualquer nova instância". Efeito colateral: força a senha fraca e pública do Achado 2 a permanecer válida para sempre, anulando qualquer tentativa de rotação.

**Correção:** a senha inicial passou a ser lida de `process.env.GX_ADMIN_INITIAL_PASSWORD` e **jamais sobrescreve** um hash já existente:

```ts
if (!existing.passwordHash && HENRIQUE_INITIAL_PASSWORD)
  patch.passwordHash = await hashPassword(HENRIQUE_INITIAL_PASSWORD);
```

**Verificado depois da correção** (banco limpo → login → troca → cold start):

| Passo | Resultado |
|---|---|
| Banco novo, login com `GX_ADMIN_INITIAL_PASSWORD` | `200` — entra como admin |
| Trocar a senha pela interface | `200` — confirmado no banco |
| **Cold start** | — |
| Login com a senha **nova** | `200 — LOGIN OK -> Henrique Senna` |
| Login com a senha **inicial** | `401` (correto: não sobrescreve mais) |

---

## Achado 2 — Crítica: senha real do administrador no repositório público

**Evidência (antes):** `src/lib/server.ts:11` (`const HENRIQUE_DEFAULT_PASSWORD = "255914Lh@"`) e, embutida literalmente, também em `scripts/verify-ecosystem.mjs:19`, `scripts/verify-workspace.mjs:88` e `:119`.

O repositório `GrupoXuy/gx-hub-escritorio` é **público**, então a senha do administrador estava acessível a qualquer pessoa, e o Achado 1 garantia que ela continuasse funcionando mesmo depois de trocada.

**Correção aplicada:**

- Nenhuma senha volta ao código: `src/lib/server.ts` lê `GX_ADMIN_INITIAL_PASSWORD` do ambiente.
- `scripts/verify-*.mjs` agora exigem `GX_TEST_EMAIL` / `GX_TEST_PASSWORD` e **falham com erro claro** se não estiverem definidas (em vez de usar uma credencial embutida).
- Confirmado: `git grep 255914` não retorna mais nada nos arquivos rastreados.

**⚠️ AÇÕES OBRIGATÓRIAS QUE ESTE PR NÃO FAZ POR VOCÊ**

1. **Trocar a senha** — o valor que estava em `src/lib/server.ts:11` continua no **histórico do Git** (commit `95f33c4`) e deve ser tratado como vazado. Trocar a senha pela interface agora funciona (Achado 1 corrigido), mas o valor antigo precisa ser considerado comprometido.
2. **Limpar o histórico (opcional, destrutivo)** — o repositório tem um único commit, então é possível recriá-lo sem o segredo e fazer force-push. Isto **regrava o histórico** e exige coordenação com quem clonou. Mesmo assim, quem já clonou ou forkou continua com o valor: **rotacionar a senha é a mitigação que realmente resolve**, a limpeza do histórico é secundária.
3. **Configurar `GX_ADMIN_INITIAL_PASSWORD` como secret na Vercel** — sem ela, um banco novo cria o Henrique **sem senha** (não é um travamento: o app sobe, `/api/health` responde 200, mas ninguém consegue entrar como admin).

Comportamento sem a variável, verificado:

```
GX workspace: GX_ADMIN_INITIAL_PASSWORD não definida. A conta do Henrique Senna
será criada sem senha e não poderá entrar até que uma senha seja definida.
 POST /api/auth/password 401
 GET  /api/health        200
```

---

## Achado 3 — Alta: email tratado como padrão SQL `LIKE`

**Evidência (antes):** `src/app/api/auth/login/route.ts:13`, `src/app/api/auth/password/route.ts:19`, `src/app/api/auth/credentials/route.ts:17`, `src/app/api/auth/register/route.ts:28` — todos com `ilike(users.email, email)`.

`ilike` recebe o email enviado pela pessoa como um **padrão** `LIKE`, então `_` e `%` viram curingas. O próprio código já sabia o padrão correto: `src/app/api/users/route.ts:38` e `:75` usam `lower(email) = lower($1)`.

**Reprodução (antes da correção)** — usuária real `ana.silva@teste.com`, senha `SenhaForte123`:

| Email enviado | Resultado |
|---|---|
| `ana.silva@teste.com` (correto) | `200 — LOGIN OK em «Ana Silva»` |
| `ana_silva@teste.com` (`_` é curinga) | `200 — LOGIN OK em «Ana Silva»` |
| `anaXsilva@teste.com` (caractere literal) | `401` |
| `ana%@teste.com` (`%` é curinga) | `200 — LOGIN OK em «Ana Silva»` |

**Cadeia completa de takeover do administrador**, combinando os Achados 2 + 3 — sem saber o email do admin:

```
POST /api/auth/password
{"email":"%@hotmail.com","password":"<senha que estava commitada no repo>"}

→ 200 — LOGIN OK em «Henrique Senna» id=henrique-senna isAdmin=true
```

**Impacto:** um atacante com a senho commitada entrava como administrador sem precisar saber o email, e curingas permitiam autenticar em contas cujo email apenas *casasse* com o padrão.

**Correção:** helper `emailEquals()` em `src/lib/server.ts` (comparação exata, insensível a caixa, com `trim`) aplicado nos quatro endpoints.

**Verificado depois da correção:**

| Email enviado | Resultado |
|---|---|
| `ana.silva@teste.com` | `200 — LOGIN OK` |
| `ANA.SILVA@TESTE.COM` (caixa alta) | `200 — LOGIN OK` |
| `" ana.silva@teste.com "` (espaços) | `200 — LOGIN OK` |
| `ana_silva@teste.com` | `401` |
| `ana%@teste.com` | `401` |
| `%@hotmail.com` | `401` |

---

## Achado 4 — Média: sem limitação de tentativas

**Evidência (antes):** nenhum dos endpoints de autenticação impunha limite; o login era livre para força bruta.

**Correção:** `rateLimit()` + `clientKey()` em `src/lib/server.ts`, aplicados em `/api/auth/login`, `/api/auth/password` e `/api/auth/credentials` (10 tentativas / 15 min) e `/api/auth/register` (5 tentativas / 15 min, cobrindo adivinhação de token de convite).

**Verificado:**

```
tentativa  1 -> HTTP:401  Email ou senha incorretos.
tentativa  2 -> HTTP:429  Muitas tentativas. Aguarde alguns minutos e tente novamente.
...
tentativa  8 -> HTTP:429  Muitas tentativas. Aguarde alguns minutos e tente novamente.
```

**Limitação honesta:** o contador é **em memória, por instância**. Em funções serverless cada instância conta separado, então isto desencoraja força bruta casual mas **não** é um bloqueio distribuído. Para bloqueio global, trocar o `Map` por um store compartilhado (Upstash/Redis, Vercel KV). O comentário no código registra isso.

---

## Achado 5 — Média: cookie de sessão sem `Secure`

**Evidência (antes):** `src/lib/server.ts:188` (`gx_session`) e `:175` (`gx_guest_session`) definiam `httpOnly` e `sameSite: "lax"`, mas não `secure`.

**Correção:** `secure: process.env.NODE_ENV === "production"` nos dois cookies. Continua funcionando em desenvolvimento local (HTTP) e passa a exigir HTTPS em produção.

---

## Achados 8, 9 e 10 (corrigidos)

**8 — `cleanupTestData()` apagava usuários reais (baixa).** Removia qualquer usuário não-admin cujo **nome** começasse com `teste` (`ilike(users.name, "teste%")`), e rodava em **todo** `seedWorkspace()`. Um membro real chamado "Teste…" era apagado no próximo cold start.

Passou a exigir **os dois** marcadores de teste — nome começando com `teste` **e** email no formato `test.user.<timestamp>@…`, que é exatamente o que `scripts/verify-workspace.mjs` cria.

Verificado com os dois predicados lado a lado, no mesmo banco:

```
predicado ANTIGO (só nome)  -> apagaria: Teste Membro 999 <teste.pessoa@empresa.com>
predicado NOVO (nome+email) -> apagaria: (ninguém)
```

E após um cold start real, com os três tipos de usuário criados:

| Usuário | Esperado | Resultado |
|---|---|---|
| Pessoa real "Teste Membro 999", email `teste.pessoa@empresa.com` | sobreviver | sobreviveu ✅ |
| Usuário de teste, nome **e** email de teste | ser removido | removido ✅ |
| Usuário comum (controle) | sobreviver | sobreviveu ✅ |

**9 — `/api/auth/password` não troca senha (info).** Apesar do nome, só autenticava; quem troca credenciais é `/api/auth/credentials`. Havia dois endpoints de login fazendo a mesma coisa: esse (`loginEmail()`) e `/api/auth/login` (usado por `scripts/verify-workspace.mjs`).

Consolidado: a lógica foi para `loginByEmail()` em `src/lib/auth-login.ts`, com `/api/auth/login` como canônica. `/api/auth/password` virou um **alias deprecado** de 2 linhas — mantido de propósito para não derrubar abas abertas com um bundle antigo do front-end, já que o app está em produção. Está marcado no código para remoção depois de um ciclo de deploy. As duas rotas compartilham o mesmo escopo de limitador, então contam juntas (verificado: 9 erros em `/api/auth/login` bloqueiam a 10ª tentativa via `/api/auth/password`).

**10 — Hook `login()` morto (info).** `src/hooks/use-workspace.ts:52` enviava `{ userId }` para `/api/auth/login`, que lê `{ email, password }` → sempre HTTP 400. Era desestruturado em `workspace-app.tsx:32` mas **nunca chamado** (o `AuthGate` só recebe `onLoginEmail`). Hook e desestruturação removidos.

> Correção ao texto original desta auditoria: a rota `/api/auth/login` **não** era órfã — é usada por `scripts/verify-workspace.mjs:124` e `:153`. Só o hook estava morto. A rota foi mantida e promovida a canônica.

---

## Fora do escopo desta auditoria

Não foram auditados: sinalização WebRTC e transporte de mídia (`/api/call`, `/api/signals`), convites de cliente e leads (`/api/client-invites`, `/api/leads`), renderização do avatar, e a lógica de agenda (`/api/meetings`). Verificações estáticas rápidas dessas áreas não apontaram problemas, mas **não** foram testadas em execução.

A verificação ficou restrita a `localhost`. Não foram exercitados: login em duas sessões simultâneas, expiração real de convite de cliente, nem chamada WebRTC entre dois navegadores.

---

## Verificação executada

```
npm exec tsc -- --noEmit         → 0 erros
npm run lint                     → 0 erros (4 avisos preexistentes de <img>)
npm run build                    → ok
```

Comportamento conferido em execução, além dos casos já citados:

| Verificação | Resultado |
|---|---|
| `/api/auth/login` (canônica) com email correto | `200` |
| `/api/auth/password` (alias) com email correto | `200` |
| Curinga `%@hotmail.com` nas duas rotas | `401` |
| Escopo único do limitador (erros numa rota bloqueiam a outra) | `429` na 10ª tentativa |
| Pessoa real chamada "Teste…" preservada após cold start | sobreviveu |
| Usuário de teste dos scripts removido após cold start | removido |

Um detalhe do ambiente que engana na hora de testar: **`/api/health` não dispara o `seedWorkspace()`** — ele só executa `select 1` (`src/app/api/health/route.ts`). Para forçar o seed e as rotinas de limpeza, chame um endpoint que as invoque (ex.: `/api/auth/login`).

Ambiente de teste: PostgreSQL 18.3 real (PGlite sobre o protocolo de wire na porta 5432), aplicação Next.js 16.2.6 (`next dev`) com `DATABASE_URL` apontando para ele. Nenhuma credencial de produção foi usada.
