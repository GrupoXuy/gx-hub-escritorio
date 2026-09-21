-- GX Hub Escritório — leads por usuário e integração com GX Radar
-- 0003_leads_radar.sql
--
-- Leads originados pelo Radar pertencem explicitamente a um usuário.
-- Leads antigos de convites são vinculados ao criador do convite.

ALTER TABLE gx_leads ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE gx_leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client-invite';
ALTER TABLE gx_leads ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '';
ALTER TABLE gx_leads ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE gx_leads ADD COLUMN IF NOT EXISTS website;

UPDATE gx_leads l
SET owner_id = ci.created_by
FROM gx_client_invites ci
WHERE l.client_invite_id = ci.id
  AND l.owner_id IS NULL;

UPDATE gx_leads l
SET owner_id = m.organizer_id
FROM gx_meetings m
WHERE l.meeting_id = m.id
  AND l.owner_id IS NULL;

ALTER TABLE gx_leads ALTER COLUMN client_invite_id DROP NOT NULL;
ALTER TABLE gx_leads ALTER COLUMN meeting_id DROP NOT NULL;
ALTER TABLE gx_leads ALTER COLUMN client_invite_id DROP NOT NULL;
ALTER TABLE gx_leads ALTER COLUMN meeting_id DROP NOT NULL;
ALTER TABLE gx_leads ALTER COLUMN owner_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gx_leads_owner_id_fkey'
  ) THEN
    ALTER TABLE gx_leads
      ADD CONSTRAINT gx_leads_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES gx_users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS gx_leads_owner_id_idx ON gx_leads (owner_id);
CREATE INDEX IF NOT EXISTS gx_leads_source_idx ON gx_leads (source);
CREATE INDEX IF NOT EXISTS gx_leads_created_at_idx ON gx_leads (created_at DESC);
