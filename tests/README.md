# Testes de fumaça (Playwright)

```bash
npx playwright install chromium
GX_TEST_BASE_URL=https://gx-hubofficemeet.vercel.app \
GX_TEST_EMAIL=seu@email.com GX_TEST_PASSWORD='sua senha' npm run test:e2e
```

Também dá para apontar para a prévia de uma PR (`GX_TEST_BASE_URL=https://gx-hub-escritorio-git-<slug>.vercel.app`).
Sem `GX_TEST_EMAIL`/`GX_TEST_PASSWORD` os testes são pulados: o login é por email e senha
individuais e o repositório não guarda credencial de teste nenhuma.
