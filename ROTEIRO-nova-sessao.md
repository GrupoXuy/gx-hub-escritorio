# Roteiro — retomar o trabalho em uma nova sessão

Este arquivo existe porque a sessão anterior perdeu tudo: os artefatos ficaram
só no workspace, nada foi commitado, e o workspace não foi restaurado.
**Tudo o que importa está commitado neste repositório** — inclusive este arquivo.

## Se o workspace foi reaproveitado

```bash
cd /home/user/gx-hub-escritorio && git status && git log --oneline -5
```

## Se foi clonado do zero

```bash
git clone https://github.com/GrupoXuy/gx-hub-escritorio.git
cd gx-hub-escritorio
git checkout arena/01a09741-gx-hub-escritorio
npm install
```

## Prompt para colar na nova sessão

> Continuar o trabalho em `GrupoXuy/gx-hub-escritorio`, branch
> `arena/01a09741-gx-hub-escritorio`. Leia primeiro `AUDITORIA-gx-hub-escritorio.md`
> (achados 1–10, com evidência `arquivo:linha`) e `CHECKLIST-publicacao.md`.
> Corrigidos e verificados: senha do admin redefinida a cada cold start (crítica),
> senha commitada no repositório (crítica), email tratado como padrão SQL `LIKE`
> (alta), ausência de limitador de tentativas (média), cookie sem `Secure` (média).
> Abertos, em ordem de prioridade: (8) `cleanupTestData()` apaga usuários reais
> cujo nome começa com "teste"; (9) `/api/auth/password` não troca senha, é um
> segundo endpoint de login; (10) `/api/auth/login` é rota órfã que sempre
> retorna 400. Pendências fora do código: rotacionar a senha do administrador
> depois do deploy e configurar `GX_ADMIN_INITIAL_PASSWORD` como secret na Vercel.
> Não foram auditados: sinalização WebRTC, convites de cliente/leads, agenda e
> renderização do avatar. Antes de qualquer mudança: `npm install`,
> `npm exec tsc --noEmit`, `npm run lint`, `npm run build`.

## Como reproduzir o ambiente de validação sem credencial de produção

Não há Postgres instalado no sandbox; usei PGlite servido no protocolo de wire:

```bash
# terminal 1 — Postgres real (WASM) na porta 5432
mkdir -p /tmp/gxpg && cd /tmp/gxpg
npm init -y && npm i @electric-sql/pglite @electric-sql/pglite-socket
cat > server.mjs <<'EOF'
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const db = await PGlite.create({ dataDir: "/tmp/gxpg/data" });
const server = new PGLiteSocketServer({ db, port: 5432, host: "0.0.0.0", maxConnections: 20 });
await server.start();
console.log("PGLITE READY:", (await db.query("select version()")).rows[0].version);
EOF
node server.mjs

# terminal 2 — app apontando para ele
cd /home/user/gx-hub-escritorio
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
GX_ADMIN_INITIAL_PASSWORD=SenhaInicialAdmin2026 \
  npx next dev --hostname 0.0.0.0 --port 3000
```

Para simular cold start: parar e subir o terminal 2 de novo.

## Regra desta vez

**Commitar no fim de cada sessão.** O workspace não é garantido; o repositório, sim.
