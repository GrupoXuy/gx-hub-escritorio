# GX Hub Office Meet — Auditoria Fase 0

Data da auditoria: 2026-10-16
Repositório: https://github.com/GrupoXuy/gx-hub-escritorio
Branch auditada: main
Último commit auditado: 9fc1ce90d0795460e350668ce244e47bde009c5e
Produção: https://gxhubofficemeet.vercel.app

## Resumo executivo

- Vercel reporta o deployment de produção do commit `9fc1ce90d0795460e350668ce244e47bde009c5e` como READY; o check combinado do commit está success.
- O histórico contém seis deployments ERROR antes do deployment READY mais recente. A causa dos erros foi identificada nos logs: export `Instagram` ausente em `lucide-react`. A correção posterior usa `InstagramGlyph`.
- A suíte de smoke test existe em `scripts/verify-workspace.mjs` e exige credenciais de teste por variáveis de ambiente. Não foi executada contra produção nesta auditoria, pois as credenciais de teste não foram fornecidas e não se deve criar/alterar usuários reais sem uma conta de teste controlada.
- A consulta do health endpoint pela ferramenta web não foi possível. Os logs de runtime do plano Hobby não retêm a janela solicitada; a consulta recente de erros mostrou um aviso do driver PostgreSQL sobre a semântica futura de SSL, não uma falha de aplicação confirmada.
- A integração GX Radar ainda não está pronta para produção: a variável `GX_RADAR_API_KEY` não consta na lista de variáveis da Vercel. O endpoint rejeita chamadas sem ela.
- A Vercel marca algumas variáveis de banco e credenciais administrativas como `readable-secret`. Isso é uma sinalização de configuração da plataforma e exige mudar o tipo para `sensitive` quando suportado; não comprova, por si só, que houve exposição pública.
- O endpoint de workspace consulta mensagens de todos os ambientes, ao contrário da filtragem já aplicada às reuniões da diretoria. Isso pode expor mensagens da diretoria aos membros comuns e deve ser corrigido na Fase 1.
- O schema é inicializado pelo `seedWorkspace` em runtime com DDL e alterações idempotentes. Isso reduz a necessidade de migrações manuais, mas exige cuidado para não executar alterações destrutivas nem introduzir divergência com Drizzle.

## Baseline de tecnologia

- Next.js 16.2.6, React 19, TypeScript, Drizzle ORM e PostgreSQL.
- Scripts disponíveis: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`.
- Playwright está configurado; a rotina completa também valida login, criação de usuário, chat entre sessões, responsividade, agenda e WebRTC com dispositivos sintéticos.
- A aplicação usa sessões por cookie HTTP-only e autenticação por email/senha.

## Plano de execução aprovado

1. Fase 1: segurança e integridade — corrigir visibilidade de mensagens privadas, revisar tipo dos segredos e adicionar testes de autorização.
2. Fase 2: GX Radar e Leads — cadastrar a chave servidor-a-servidor e testar atribuição/idempotência com o emissor real.
3. Fase 3: Realtime e presença — medir antes de substituir o polling.
4. Fase 4: chamadas e agenda — validar WebRTC e concorrência.
5. Fase 5: UX e produtividade — melhorias responsivas e comerciais.
6. Fase 6: CI/CD, observabilidade e aceite final.

## Limitações desta auditoria

Não foram lidos nem exibidos valores de segredos. Nenhum teste autenticado destrutivo foi executado contra produção. O deployment READY não substitui os testes funcionais ponta a ponta.
