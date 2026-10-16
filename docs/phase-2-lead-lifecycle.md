# GX Hub Office Meet — Fase 2: Ciclo de vida de Leads

Data: 2026-10-16

## Regra de negócio

Um lead criado quando o contato aceita um convite é um registro de CRM independente da reunião que originou o contato. Cancelar ou remover a reunião não deve apagar os dados de contato capturados.

## Implementação

- Ao excluir uma reunião, o Office Meet limpa a referência de `meeting_id` e `client_invite_id` dos leads associados antes de remover as linhas de reunião/convite.
- Nome, email, WhatsApp, origem, proprietário e data de captura do lead são preservados.
- A tela Leads continua funcionando com a reunião nula (campo de reunião não aparece); a API já usa `LEFT JOIN` para a reunião.
- O script Playwright verifica a preservação do lead depois do cancelamento.
- O script de limpeza remove exclusivamente emails sintéticos registrados em `artifacts/test-leads.json`, validados pelo padrão de teste, e pode executar a limpeza de leads mesmo sem um arquivo de usuários.

## Escopo e cautelas

Esta alteração não unifica automaticamente contatos repetidos em reuniões diferentes; deduplicação por email/WhatsApp exige uma regra de negócio explícita. Ela não altera permissões da base: cada usuário continua vendo somente seus próprios leads. GX Radar continua exclusivo do Office System e não participa deste fluxo.
