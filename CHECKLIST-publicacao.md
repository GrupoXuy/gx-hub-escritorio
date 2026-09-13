# Checklist de publicação — GX Hub Escritório

Ordem importa. **Não troque a senha antes do deploy**, senão o comportamento do Achado 1 a reverte para o valor antigo no próximo cold start.

## 1. Preparar o ambiente (antes do deploy)

- [ ] Adicionar `GX_ADMIN_INITIAL_PASSWORD` como **secret** na Vercel (Project → Settings → Environment Variables). Sem ela, um banco novo cria o Henrique sem senha.
- [ ] Conferir que `DATABASE_URL` continua apontando para o Postgres correto.
- [ ] Opcional: definir `GX_TEST_EMAIL` / `GX_TEST_PASSWORD` / `GX_TEST_BASE_URL` se for rodar os scripts de verificação.

## 2. Publicar

- [ ] Merge do PR na `main` → deploy automático.
- [ ] `GET /api/health` → `{"ok":true,...}`.
- [ ] Abrir `/` → tela de login aparece.

## 3. Rotacionar a senha do administrador (depois do deploy)

- [ ] Entrar com a senha antiga **uma última vez** (ela ainda funciona até ser trocada).
- [ ] Trocar a senha pela interface.
- [ ] **Sair e entrar de novo** com a senha nova.
- [ ] Forçar um cold start (aguardar a instância esfriar ou fazer um redeploy) e entrar **novamente** com a senha nova — é o teste que o Achado 1 fazia falhar.
- [ ] Confirmar que a senha antiga **não** entra mais.
- [ ] Tratar o valor antigo como comprometido: ele está no histórico do Git (commit `95f33c4`). Se era reutilizado em outros serviços, trocar lá também.

## 4. Validações manuais (10)

| # | O que validar | Esperado |
|---|---|---|
| 1 | Login com email exato | Entra |
| 2 | Login com email em caixa alta / com espaços | Entra (comparação é normalizada) |
| 3 | Login com curinga `ana_silva@...` | **401** (antes entrava) |
| 4 | Login com curinga `ana%@...` | **401** (antes entrava) |
| 5 | Login com `%@hotmail.com` | **401** (antes dava takeover do admin) |
| 6 | Trocar senha → sair → entrar com a nova | Entra |
| 7 | Trocar senha → cold start → entrar com a nova | Entra (antes falhava) |
| 8 | 11 logins seguidos com senha errada | A partir do 11º, **429** |
| 9 | Agendar, entrar e sair de uma sala | Funciona |
| 10 | Enviar mensagem no chat e ver em outra sessão | Sincroniza |

## 5. Verificação automatizada (opcional, requer Playwright)

```bash
GX_TEST_BASE_URL=https://... GX_TEST_EMAIL=... GX_TEST_PASSWORD=... \
  node scripts/verify-workspace.mjs
```

Os scripts agora **falham com erro claro** se `GX_TEST_EMAIL` / `GX_TEST_PASSWORD` não estiverem definidas (antes usavam uma senha embutida no código).

## 6. Limpeza do histórico (opcional, destrutivo)

Somente depois de rotacionar a senha. O repositório tem um único commit, então dá para recriá-lo sem o segredo e fazer force-push — mas isso **regrava o histórico** e quem já clonou continua com o valor antigo. Rotacionar resolve; limpar o histórico é cosmético.
