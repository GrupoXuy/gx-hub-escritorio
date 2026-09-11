-- 0002 — Estúdio do avatar: visual completo persistido por pessoa.
--
-- `avatar_look` guarda o JSON do `AvatarLook` (pele, penteado, cor do cabelo,
-- barba, óculos, traje, acessório, expressão e aura), serializado por
-- `serializeLook()` em src/lib/avatar.ts.
--
-- O servidor aplica o mesmo ALTER de forma idempotente na inicialização
-- (DDL_STATEMENTS em src/lib/server.ts), então rodar isto é opcional.

alter table if exists gx_users add column if not exists avatar_look text not null default '';

comment on column gx_users.avatar_look is 'JSON do AvatarLook usado pelo sprite PixelAvatar';
