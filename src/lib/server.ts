import { cookies } from "next/headers";
import { db } from "@/db";
import { users, rooms, messages, meetings, invitations, signals, clientInvites } from "@/db/schema";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { DEFAULT_ME, ROOM_DATA } from "@/lib/workspace";
import { serializeLook, presetLook } from "@/lib/avatar";

export const HENRIQUE_EMAIL = "carneiroluiz1@hotmail.com";
export const HENRIQUE_ID = "henrique-senna";
const HENRIQUE_DEFAULT_PASSWORD = "255914Lh@";

export function isHenriqueAdmin(member: { id: string; email?: string | null; isAdmin?: boolean }) {
  return member.isAdmin === true && (member.id === HENRIQUE_ID || member.email?.trim().toLowerCase() === HENRIQUE_EMAIL);
}

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS gx_rooms (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL, kind text NOT NULL, capacity integer NOT NULL DEFAULT 8, color text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gx_users (id text PRIMARY KEY, name text NOT NULL, role text NOT NULL DEFAULT 'Membro do ecossistema', company text NOT NULL DEFAULT 'Grupo X', avatar text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#c7a66e', room_id text NOT NULL DEFAULT 'recepcao', status text NOT NULL DEFAULT 'available', x real NOT NULL DEFAULT 61, y real NOT NULL DEFAULT 73, is_demo boolean NOT NULL DEFAULT false, is_admin boolean NOT NULL DEFAULT false, access_token text, hand_raised boolean NOT NULL DEFAULT false, call_room text, mic_enabled boolean NOT NULL DEFAULT false, camera_enabled boolean NOT NULL DEFAULT false, last_seen timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS can_access_group_system boolean NOT NULL DEFAULT false`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS guest_invite_id text`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS guest_expires_at timestamptz`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS access_token text`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS email text`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS password_hash text`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS gender text`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'idle'`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'dr'`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS sitting_on text`,
  `ALTER TABLE gx_users ADD COLUMN IF NOT EXISTS avatar_look text NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS gx_messages (id text PRIMARY KEY, sender_id text NOT NULL REFERENCES gx_users(id), room_id text NOT NULL DEFAULT 'geral', content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS gx_messages_created_at_idx ON gx_messages (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS gx_meetings (id text PRIMARY KEY, title text NOT NULL, description text NOT NULL DEFAULT '', room_id text NOT NULL REFERENCES gx_rooms(id), starts_at timestamptz NOT NULL, duration integer NOT NULL DEFAULT 30, organizer_id text NOT NULL REFERENCES gx_users(id), created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS gx_meetings_starts_at_idx ON gx_meetings (starts_at)`,
  `CREATE TABLE IF NOT EXISTS gx_signals (id serial PRIMARY KEY, from_id text NOT NULL, to_id text NOT NULL, room_id text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS gx_signals_to_id_idx ON gx_signals (to_id, id)`,
  `CREATE TABLE IF NOT EXISTS gx_invitations (id text PRIMARY KEY, created_by text NOT NULL REFERENCES gx_users(id), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS gx_client_invites (id text PRIMARY KEY DEFAULT gen_random_uuid(), created_by text NOT NULL REFERENCES gx_users(id), meeting_id text NOT NULL REFERENCES gx_meetings(id), expires_at timestamptz NOT NULL, used_at timestamptz, guest_user_id text, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS gx_client_invites_token_idx ON gx_client_invites (id, used_at, expires_at)`,
  `CREATE TABLE IF NOT EXISTS gx_leads (id text PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, gender text NOT NULL, whatsapp text NOT NULL, email text NOT NULL, client_invite_id text NOT NULL REFERENCES gx_client_invites(id), meeting_id text NOT NULL REFERENCES gx_meetings(id), created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS gx_leads_created_at_idx ON gx_leads (created_at DESC)`,
];

export function randomToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export function publicMember<T extends { accessToken?: string | null; passwordHash?: string | null; email?: string | null }>(member: T): Omit<T, "accessToken" | "passwordHash" | "email"> {
  const { accessToken: _dropToken, passwordHash: _dropHash, email: _dropEmail, ...rest } = member;
  return rest;
}

let seedPromise: Promise<void> | undefined;
export function seedWorkspace() {
  if (!seedPromise) seedPromise = seed().catch(error => { seedPromise = undefined; throw error; });
  return seedPromise;
}

async function seed() {
  for (const statement of DDL_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      if ((error as { code?: string })?.code !== "42P07") throw error;
    }
  }
  await db.insert(rooms).values(ROOM_DATA).onConflictDoNothing();
  await cleanupDemoData();
  await cleanupTestData();
  await cleanupExpiredGuests();
  await deduplicateHenrique();
  await ensureHenriqueAdmin();
  const missing = await db.select({ id: users.id }).from(users).where(sql`access_token IS NULL`);
  for (const row of missing) {
    await db.update(users).set({ accessToken: randomToken() }).where(eq(users.id, row.id));
  }
}

async function cleanupDemoData() {
  const demoRows = await db.select({ id: users.id }).from(users).where(or(eq(users.isDemo, true), ilike(users.id, "demo-%")));
  const demoIds = demoRows.map(row => row.id);
  const welcomeIds = ["welcome-ana", "welcome-lucas", "welcome-mariana"];
  if (demoIds.length) {
    await db.delete(signals).where(or(inArray(signals.fromId, demoIds), inArray(signals.toId, demoIds)));
    await db.delete(invitations).where(inArray(invitations.createdBy, demoIds));
    await db.delete(messages).where(or(inArray(messages.senderId, demoIds), inArray(messages.id, welcomeIds)));
    await db.delete(meetings).where(or(inArray(meetings.organizerId, demoIds), ilike(meetings.id, "demo-meeting-%")));
    await db.delete(users).where(inArray(users.id, demoIds));
  } else {
    await db.delete(messages).where(inArray(messages.id, welcomeIds));
    await db.delete(meetings).where(ilike(meetings.id, "demo-meeting-%"));
  }
}

async function cleanupTestData() {
  const testRows = await db.select({ id: users.id }).from(users).where(and(ilike(users.name, "teste%"), eq(users.isAdmin, false)));
  const testIds = testRows.map(row => row.id);
  if (testIds.length) {
    await db.delete(signals).where(or(inArray(signals.fromId, testIds), inArray(signals.toId, testIds)));
    await db.delete(invitations).where(inArray(invitations.createdBy, testIds));
    await db.delete(messages).where(inArray(messages.senderId, testIds));
    await db.delete(meetings).where(inArray(meetings.organizerId, testIds));
    await db.delete(users).where(inArray(users.id, testIds));
  }
  await db.delete(messages).where(or(ilike(messages.content, "%quem chegar, de um oi%"), ilike(messages.content, "conectados para construir%")));
  await db.delete(meetings).where(or(eq(meetings.title, "Teste de sala"), ilike(meetings.title, "conex_o de valida%")));
}

async function cleanupExpiredGuests() {
  const expired = await db.select({ id: users.id }).from(users).where(and(eq(users.isGuest, true), sql`${users.guestExpiresAt} <= now()`));
  const ids = expired.map(row => row.id);
  if (!ids.length) return;
  await db.delete(signals).where(or(inArray(signals.fromId, ids), inArray(signals.toId, ids)));
  await db.delete(users).where(inArray(users.id, ids));
}

async function deduplicateHenrique() {
  const henriques = await db.select().from(users).where(and(eq(users.name, "Henrique Senna"), eq(users.isDemo, false))).orderBy(desc(users.lastSeen), asc(users.id));
  if (henriques.length < 2) return;
  const [keeper, ...dupes] = henriques;
  const dupIds = dupes.map(dup => dup.id);
  await db.update(messages).set({ senderId: keeper.id }).where(inArray(messages.senderId, dupIds));
  await db.update(meetings).set({ organizerId: keeper.id }).where(inArray(meetings.organizerId, dupIds));
  await db.delete(signals).where(or(inArray(signals.fromId, dupIds), inArray(signals.toId, dupIds)));
  await db.delete(invitations).where(inArray(invitations.createdBy, dupIds));
  await db.delete(users).where(inArray(users.id, dupIds));
}

async function ensureHenriqueAdmin() {
  const [existing] = await db.select().from(users).where(and(eq(users.name, "Henrique Senna"), eq(users.isDemo, false))).limit(1);
  const passwordHash = await bcrypt.hash(HENRIQUE_DEFAULT_PASSWORD, 10);
  if (!existing) {
    await db.insert(users).values({
      id: "henrique-senna", name: "Henrique Senna", role: "Fundador & CEO", company: "Grupo X",
      avatar: DEFAULT_ME.avatar, color: "#c7a66e", avatarLook: serializeLook(presetLook("gx-executivo")), roomId: "recepcao", status: "available",
      x: 61, y: 73, isDemo: false, isAdmin: true, canAccessGroupSystem: true, email: HENRIQUE_EMAIL, passwordHash,
      accessToken: randomToken(), lastSeen: new Date(0),
    }).onConflictDoNothing();
    return;
  }
  const patch: Partial<typeof users.$inferInsert> = {};
  if (!existing.isAdmin) patch.isAdmin = true;
  if (!existing.canAccessGroupSystem) patch.canAccessGroupSystem = true;
  if (!existing.accessToken) patch.accessToken = randomToken();
  if (existing.email !== HENRIQUE_EMAIL) patch.email = HENRIQUE_EMAIL;
  if (!existing.passwordHash || existing.passwordHash !== passwordHash) patch.passwordHash = passwordHash;
  if (Object.keys(patch).length) {
    await db.update(users).set(patch).where(eq(users.id, existing.id));
  }
  // O painel administrativo é exclusivo do Henrique Senna.
  await db.update(users).set({ isAdmin: false }).where(and(eq(users.isAdmin, true), sql`${users.id} <> ${existing.id}`));
}

export type MemberRow = typeof users.$inferSelect;

export async function getMember(): Promise<MemberRow | null> {
  const jar = await cookies();
  const id = jar.get("gx_session")?.value;
  if (!id) return null;
  const [member] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isDemo, false), eq(users.isGuest, false))).limit(1);
  return member || null;
}

export async function getCallMember(): Promise<MemberRow | null> {
  const normal = await getMember();
  if (normal) return normal;
  const jar = await cookies();
  const id = jar.get("gx_guest_session")?.value;
  if (!id) return null;
  const [guest] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isGuest, true), sql`${users.guestExpiresAt} > now()`)).limit(1);
  return guest || null;
}

export async function setGuestSession(id: string, maxAgeSeconds: number) {
  const jar = await cookies();
  jar.set("gx_guest_session", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: Math.max(60, maxAgeSeconds) });
}

export async function clearGuestSession() {
  const jar = await cookies();
  jar.delete("gx_guest_session");
}

export async function setSession(id: string) {
  const jar = await cookies();
  jar.set("gx_session", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete("gx_session");
}

export function validProfileText(value: unknown, min = 2, max = 80) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

export function validColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function validEmail(value: unknown) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.trim().length <= 120;
}

export function validPassword(value: unknown) {
  return typeof value === "string" && value.length >= 8 && value.length <= 200;
}

export function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function stripSecrets<T extends { passwordHash?: string | null }>(member: T): Omit<T, "passwordHash"> {
  const { passwordHash: _drop, ...rest } = member;
  return rest;
}

export function fail(error: unknown, message = "O workspace está temporariamente indisponível. Tente novamente.") {
  console.error("GX workspace:", error);
  return Response.json({ error: message }, { status: 500 });
}
