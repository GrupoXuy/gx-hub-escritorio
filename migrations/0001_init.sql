-- GX Hub — Schema inicial (PostgreSQL)
-- Execute este arquivo UMA vez no editor SQL do seu banco (Neon, Supabase etc.)

create table if not exists gx_rooms (
  id text primary key,
  name text not null,
  description text not null,
  kind text not null,
  capacity integer not null default 8,
  color text not null
);

create table if not exists gx_users (
  id text primary key,
  name text not null,
  role text not null default 'Membro do ecossistema',
  company text not null default 'Grupo X',
  avatar text not null default '',
  color text not null default '#c7a66e',
  avatar_look text not null default '',
  room_id text not null default 'recepcao',
  status text not null default 'available',
  x real not null default 61,
  y real not null default 73,
  is_demo boolean not null default false,
  is_admin boolean not null default false,
  can_access_group_system boolean not null default false,
  is_guest boolean not null default false,
  guest_invite_id text,
  guest_expires_at timestamptz,
  gender text,
  access_token text,
  hand_raised boolean not null default false,
  call_room text,
  mic_enabled boolean not null default false,
  camera_enabled boolean not null default false,
  last_seen timestamptz not null default now()
);

create table if not exists gx_messages (
  id text primary key default gen_random_uuid(),
  sender_id text not null references gx_users(id),
  room_id text not null default 'geral',
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists gx_messages_created_at_idx on gx_messages (created_at desc);

create table if not exists gx_meetings (
  id text primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  room_id text not null references gx_rooms(id),
  starts_at timestamptz not null,
  duration integer not null default 30,
  organizer_id text not null references gx_users(id),
  created_at timestamptz not null default now()
);
create index if not exists gx_meetings_starts_at_idx on gx_meetings (starts_at);

create table if not exists gx_signals (
  id serial primary key,
  from_id text not null,
  to_id text not null,
  room_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists gx_signals_to_id_idx on gx_signals (to_id, id);

create table if not exists gx_invitations (
  id text primary key default gen_random_uuid(),
  created_by text not null references gx_users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists gx_client_invites (
  id text primary key default gen_random_uuid(),
  created_by text not null references gx_users(id),
  meeting_id text not null references gx_meetings(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  guest_user_id text,
  created_at timestamptz not null default now()
);
create index if not exists gx_client_invites_token_idx on gx_client_invites (id, used_at, expires_at);

create table if not exists gx_leads (
  id text primary key default gen_random_uuid(),
  name text not null,
  gender text not null,
  whatsapp text not null,
  email text not null,
  client_invite_id text not null references gx_client_invites(id),
  meeting_id text not null references gx_meetings(id),
  created_at timestamptz not null default now()
);
create index if not exists gx_leads_created_at_idx on gx_leads (created_at desc);
