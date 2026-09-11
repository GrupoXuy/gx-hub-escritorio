# GX Hub — Escritório virtual Grupo X

Um workspace em português inspirado em ambientes isométricos, com a identidade grafite e dourada do Grupo X.

## Funcionalidades

- Mapa interativo com avatares, movimentação por clique ou teclado, status, gestos, zoom e tela cheia.
- **Estúdio do avatar:** tom de pele, 13 penteados e 10 cores de cabelo, barba, óculos, traje (terno, blazer, camisa social, moletom, camiseta GX), acessório (fone, boné, brinco, crachá GX), expressão e aura dourada — com prévia de frente/costas, em pé, sentado e acenando.
- **Sprite desenhado em código** (`src/lib/avatar-sprite.ts`): contorno por dilatação de alpha, luz de recorte dourada em quem você é, sombra de contato suave, respiração, passada com pernas e braços em contra-fase e piscada com tempo próprio por pessoa. O mesmo módulo é usado no mapa, na Sala da diretoria, no chat, na lista de equipe, no diretório, na tela de entrada da chamada e no painel administrativo.
- Presença de visitantes e chat por ambiente, sincronizados entre dispositivos e persistidos em PostgreSQL.
- Chamadas de áudio e vídeo WebRTC entre participantes reais, com microfone, câmera, modo ouvinte e compartilhamento de tela.
- Diretório da equipe, busca global, personalização do avatar e preferências locais de dispositivos.
- Agenda persistente, proteção contra reservas sobrepostas, cancelamento pelo organizador e exportação iCalendar.
- Convites de visitante com validade de sete dias e entrada com nome personalizado.
- Interface responsiva e navegação por teclado.

## Guia visual de instalação

Abra o guia com botões diretos para cada etapa:

- Produção: https://gxhubofficemeet.vercel.app/instalacao
- Preview: `/instalacao` no endereço temporário atual

O guia direciona para GitHub Codespaces, criação dos tokens, validação, publicação, painel da Vercel, domínio e Neon.

## Validar credenciais e publicar a versão atual

A publicação está preparada por scripts seguros, sem salvar tokens em remotes Git:

1. Configure como **secrets do ambiente** (não envie no chat nem commite): `GITHUB_TOKEN` e `VERCEL_TOKEN`.
2. Opcionalmente defina `GITHUB_OWNER=GrupoXuy`, `GITHUB_REPO=gx-hub-escritorio`, `VERCEL_PROJECT_NAME=gx-hub-escritorio` e `VERCEL_TEAM_ID` usando `.env.deploy.example` como modelo.
3. Valide as contas e o vínculo GitHub/Vercel:

```bash
GITHUB_TOKEN=... VERCEL_TOKEN=... ./scripts/validate-deployment.sh
```

4. Depois que a validação mostrar **Credenciais válidas**, publique:

```bash
GITHUB_TOKEN=... VERCEL_TOKEN=... ./scripts/publish-production.sh
```

O segundo script recusa alterações não commitadas, envia a `main` para `GrupoXuy/gx-hub-escritorio`, acompanha o build automático e informa a URL gerada. Os tokens são usados apenas em memória pelo processo e nunca entram no remote, commit ou log.

## Deploy permanente (GitHub + Vercel + Neon) — ✅ ATIVO

- **Link oficial de acesso:** https://gxhubofficemeet.vercel.app
- **Deploy atual da Vercel:** https://gx-hub-escritorio.vercel.app (fallback enquanto o alias `gxhubofficemeet.vercel.app` é associado ao projeto)
- **Código:** https://github.com/GrupoXuy/gx-hub-escritorio (push na `main` gera deploy automático de produção)
- **Banco:** Postgres Neon `neon-carmine-envelope` conectado ao projeto (compartilhado com o app `gx-hub`; tabelas deste app usam o prefixo `gx_`). As tabelas são criadas sozinhas no primeiro acesso (`seedWorkspace` em `src/lib/server.ts`); `migrations/0001_init.sql` e `migrations/0002_avatar_look.sql` servem como referência/documentação do schema. O visual escolhido por cada pessoa fica em `gx_users.avatar_look` (JSON validado no servidor por `sanitizeLook`); sem escolha salva, o avatar usa um visual determinístico derivado do id.
- **Acesso protegido ao sistema Grupo X:** `https://gxhubuy.lovable.app/`. Henrique Senna recebe acesso por padrão; cada membro pode ser autorizado individualmente pelo administrador em **Gerenciar usuários → Acesso ao sistema Grupo X**. O botão só aparece para quem tem essa permissão.
- **Convites de clientes:** no detalhe de uma reunião, Henrique pode criar um convite temporário de cliente. O convidado preenche nome, sexo, WhatsApp e email, entra apenas na chamada daquela reunião e não renderiza o workspace. O token é de uso único, expira ao fechar a página ou no fim da reunião, e os dados são armazenados em `gx_leads`; o painel **Leads de clientes** permite pesquisar contatos e exportar CSV.
- **Segurança e diretoria:** a Sala da diretoria é um ambiente separado com mesa de vidro, computador e mobília executiva; apenas Henrique Senna pode entrar. O histórico do chat pode ser apagado pelo administrador. Durante chamadas, a câmera frontal/traseira pode ser alternada no celular e minimizar a janela mantém áudio e vídeo ativos até sair da chamada.

Este projeto é full-stack com banco de dados, por isso **não pode** ser publicado no GitHub Pages (apenas sites estáticos). Para replicar em outra conta, o caminho recomendado, 100% gratuito:

1. **GitHub (código):** crie um repositório em [github.com/new](https://github.com/new) e envie o código do projeto.
2. **Banco de dados:** crie um Postgres gratuito no [Neon](https://neon.tech) ou [Supabase](https://supabase.com) e conecte ao projeto na Vercel (Storage) — ou defina `DATABASE_URL` manualmente nas variáveis do projeto.
3. **Vercel (link permanente):** entre em [vercel.com](https://vercel.com) com sua conta GitHub e clique em **Add New → Project** para importar o repositório. O Next.js é detectado automaticamente.
4. **Deploy:** clique em **Deploy**. Todo push no GitHub gera deploy automático — o link permanece o mesmo. Copie `TURN_SERVER_URL`, `TURN_USERNAME` e `TURN_CREDENTIAL` para o `.env` local apenas se for usar um servidor TURN.

O arquivo `.env` com segredos nunca é enviado ao GitHub (protegido pelo `.gitignore`); use `.env.example` como modelo local.

## Tecnologia

Next.js App Router, React, TypeScript, Drizzle ORM e PostgreSQL. A conexão usa `DATABASE_URL` e o cliente de `src/db/index.ts`. As tabelas estão em `src/db/schema.ts`.

O ambiente da plataforma prepara o PostgreSQL automaticamente. Após o bootstrap, aplique o schema com `npx drizzle-kit push`. As salas e a conta administradora (Henrique Senna) são inicializadas de forma idempotente pela API do workspace.

## Chamadas em produção

Câmera, microfone e compartilhamento de tela exigem HTTPS (ou localhost). Cada pessoa cadastrada abre o workspace em uma sessão própria e entra no mesmo ambiente de chamada.

O transporte de mídia é ponto a ponto e a sinalização passa por APIs autenticadas pela sessão de visitante. STUN é configurado por padrão. Para participantes atrás de firewalls corporativos ou NATs restritivos, configure um servidor TURN usando variáveis do ambiente:

- `TURN_SERVER_URL`: endereço TURN/TURNS fornecido pelo seu serviço.
- `TURN_USERNAME`: usuário de autenticação do serviço TURN.
- `TURN_CREDENTIAL`: credencial do serviço TURN.

Não coloque segredos no código ou em variáveis `NEXT_PUBLIC_*`. As configurações de ICE são entregues apenas às sessões que entram em uma chamada.

## Modelo de acesso

Este workspace utiliza sessões HTTP-only com cookie SameSite=Lax e login individual por **email e senha**. A tela de login não lista nomes, não aceita seleção de outro usuário e não permite autenticação por ID. Links individuais legados foram desativados; convites servem apenas para o primeiro cadastro, que exige email e senha próprios.

O painel administrativo é exclusivo do **Henrique Senna**. Ele fica em **Painel administrativo** na barra lateral e permite cadastrar, editar e remover membros, definir email/senha e controlar a permissão de acesso ao sistema Grupo X. Novos usuários não recebem acesso ao sistema Grupo X por padrão.

Somente pessoas cadastradas entram no escritório. Novos participantes, mensagens e reuniões são reais e persistidos no banco.

## Validação

A sequência de validação da aplicação é: `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, `npm run build` e o healthcheck da plataforma em `/api/health`.

O roteiro `scripts/verify-workspace.mjs` usa Playwright para verificar desktop, celular, perfil, agenda, convites, chat entre sessões, dispositivos e vídeo WebRTC bidirecional com dispositivos sintéticos do navegador. Requer o preview ativo, Chromium e suas dependências. Use `TEST_BASE_URL` para alterar o endereço padrão de teste. `scripts/cleanup-tests.ts` remove exclusivamente as sessões e os dados criados pelo roteiro.

## Identidade e recursos

Conteúdo institucional baseado em https://grupox.lovable.app/. Ilustração do escritório criada para esta aplicação. Tipografia Manrope distribuída sob a licença SIL Open Font License, disponível em `public/fonts/OFL.txt`. Fotografias ilustrativas de perfil servidas pelo Unsplash.

## Validar a arte do avatar sem navegador

O sprite é gerado por código, então dá para revisar a arte direto do terminal:

```bash
npm run avatar:sheet   # .avatar-preview/sheet.png: presets, penteados, peles, trajes, poses e os tamanhos reais (48/34/25/18 px)
npm run avatar:svg     # .avatar-preview/react.svg: o markup exato que o PixelAvatar entrega ao navegador
npx tsx scripts/avatar-contact-sheet.ts minha-folha.png
```

O rasterizador do script usa as mesmas camadas do componente e aplica o contorno
do mesmo jeito que o filtro `feMorphology` do SVG, incluindo o rim light dourado
do avatar próprio — o que aparece na folha de contatos é o que aparece no mapa.
