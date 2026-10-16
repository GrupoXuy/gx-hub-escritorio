# GX Hub Office Meet — Fase 1: Segurança e integridade

Data: 2026-10-16  
Repositório: https://github.com/GrupoXuy/gx-hub-escritorio  
Ambiente-alvo: https://gxhubofficemeet.vercel.app  
Base: `main` após `090613cc910ac7721e73109325e08292ac2a5560`

## Escopo

O Office Meet mantém seu workspace, reuniões, chamadas e base de Leads de convites próprios. GX Radar permanece exclusivo do GX Hub Office System.

## Correções incluídas nesta fase

- Autorização de mensagens da Sala da Diretoria no próprio endpoint, não apenas na interface.
- Acesso à sala e às reuniões da Diretoria concedido exclusivamente à conta validada de Henrique Senna.
- Criação de convites de clientes bloqueada para reuniões da Diretoria.
- Visualização e resgate de convites antigos para reuniões da Diretoria bloqueados.
- API de convidado deixa de divulgar metadados e presença da Diretoria; sessões antigas eventualmente posicionadas nesse ambiente são movidas para a recepção e têm mídia desligada.
- Roteiro Playwright ampliado com regressões de API para chat/reuniões privados, convites e isolamento do convidado.

## Validação e limitações

O roteiro automatizado completo é `scripts/verify-workspace.mjs` e requer `GX_TEST_EMAIL` e `GX_TEST_PASSWORD` de uma conta de teste controlada. Ele cobre também agenda, convites, chat, responsividade e WebRTC. Não declarar aceite ponta a ponta até executar esse roteiro no preview/ambiente de teste com credenciais válidas. A publicação READY, por si só, não comprova o fluxo funcional autenticado.

## Próximas etapas

1. Executar a suíte Playwright contra preview controlado e corrigir eventuais falhas.
2. Revisar o ciclo de vida de Leads e convites: deduplicação, expiração, deleção e atribuição ao organizador.
3. Medir polling/presença e estabilidade de chamadas antes de qualquer mudança de arquitetura.
