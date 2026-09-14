import { db } from "@/db";
import { users, signals } from "@/db/schema";
import { and, eq, gt, asc, or, lt, sql } from "drizzle-orm";
import { getCallMember, fail } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";
export const dynamic = "force-dynamic";
function iceServers() {
  const servers: { urls: string; username?: string; credential?: string }[] = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  if (process.env.TURN_SERVER_URL) servers.push({ urls: process.env.TURN_SERVER_URL, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  return servers;
}
export async function POST(request: Request) {
  try {
    const me = await getCallMember();
    if (!me) return Response.json({ error: "Entre no escritório para iniciar uma chamada." }, { status: 401 });
    const body = await request.json();
    if (body.action === "leave") {
      // Sair da chamada NÃO encerra a sessão de convidado. Antes, este caminho
      // zerava guestExpiresAt, e como getCallMember()/getGuest() exigem
      // guestExpiresAt > now(), o convidado que minimizava e saía da chamada
      // ficava com o escritório travado em "Abrindo o escritório…" e sem poder
      // voltar à chamada (401) — e o cleanupExpiredGuests() apagava a linha dele.
      // Quem encerra a visita é /api/client-invites/leave, que limpa o cookie.
      await db.update(users).set({ callRoom: null, micEnabled: false, cameraEnabled: false, lastSeen: new Date() }).where(eq(users.id, me.id));
      await db.delete(signals).where(or(eq(signals.fromId, me.id), eq(signals.toId, me.id)));
      return Response.json({ ok: true });
    }
    if (body.action === "media") {
      if (!me.callRoom) return Response.json({ error: "Entre em uma chamada primeiro." }, { status: 400 });
      await db.update(users).set({ micEnabled: !!body.micEnabled, cameraEnabled: !!body.cameraEnabled, lastSeen: new Date() }).where(eq(users.id, me.id));
      return Response.json({ ok: true });
    }
    if (body.action !== "join") return Response.json({ error: "Ação inválida." }, { status: 400 });
    const room = ROOM_DATA.find(r => r.id === body.roomId);
    if (!room) return Response.json({ error: "Sala não encontrada." }, { status: 404 });
    if (room.id === "diretoria" && !me.isAdmin) return Response.json({ error: "A Sala da diretoria é exclusiva para administradores." }, { status: 403 });
    const participants = await db.select().from(users).where(and(eq(users.callRoom, room.id), gt(users.lastSeen, new Date(Date.now() - 25000)), eq(users.isDemo, false), or(eq(users.isGuest, false), sql`${users.guestExpiresAt} > now()`)));
    if (participants.filter(p => p.id !== me.id).length >= room.capacity) return Response.json({ error: "Esta sala está cheia. Escolha outro ambiente." }, { status: 409 });
    await db.delete(signals).where(or(eq(signals.toId, me.id), eq(signals.fromId, me.id), lt(signals.createdAt, new Date(Date.now() - 3600000))));
    await db.update(users).set({ callRoom: room.id, roomId: room.id, micEnabled: !!body.micEnabled, cameraEnabled: !!body.cameraEnabled, lastSeen: new Date() }).where(eq(users.id, me.id));
    return Response.json({ roomId: room.id, iceServers: iceServers() });
  } catch (error) { return fail(error); }
}
export async function GET(request: Request) {
  try {
    const me = await getCallMember();
    if (!me) return Response.json({ error: "Sessão não encontrada." }, { status: 401 });
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");
    const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
    if (!roomId || me.callRoom !== roomId) return Response.json({ error: "Você não está nesta chamada." }, { status: 403 });
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, me.id));
    const staleBefore = new Date(Date.now() - 60000);
    const [participants, incoming] = await Promise.all([
      db.select().from(users).where(and(eq(users.callRoom, roomId), eq(users.isDemo, false), or(eq(users.isGuest, false), sql`${users.guestExpiresAt} > now()`), gt(users.lastSeen, new Date(Date.now() - 25000)))),
      db.select().from(signals).where(and(eq(signals.toId, me.id), eq(signals.roomId, roomId), gt(signals.id, after))).orderBy(asc(signals.id)).limit(100),
      db.delete(signals).where(and(eq(signals.toId, me.id), eq(signals.roomId, roomId), lt(signals.createdAt, staleBefore))),
    ]);
    return Response.json({ participants, signals: incoming }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}
