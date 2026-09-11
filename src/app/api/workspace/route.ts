import { db } from "@/db";
import { users, rooms, messages, meetings } from "@/db/schema";
import { and, desc, eq, gt, or, asc } from "drizzle-orm";
import { getMember, seedWorkspace, fail, publicMember } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";
import { serializeLook } from "@/lib/avatar";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedWorkspace();
    const session = await getMember();
    if (!session) {
      return Response.json({ needsAuth: true, users: [], inviteRequired: true }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const [me] = await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, session.id)).returning();
    const [members, team, roomList, chat, events] = await Promise.all([
      db.select().from(users).where(and(eq(users.isDemo, false), or(gt(users.lastSeen, new Date(Date.now() - 45000)), eq(users.id, me.id)))).orderBy(asc(users.name)),
      db.select().from(users).where(eq(users.isDemo, false)).orderBy(asc(users.name)),
      db.select().from(rooms),
      db.select({ id: messages.id, senderId: messages.senderId, roomId: messages.roomId, content: messages.content, createdAt: messages.createdAt, sender: users }).from(messages).innerJoin(users, eq(messages.senderId, users.id)).orderBy(desc(messages.createdAt)).limit(100),
      db.select().from(meetings).where(gt(meetings.startsAt, new Date(Date.now() - 86400000))).orderBy(asc(meetings.startsAt)).limit(100),
    ]);
    const visibleEvents = me.isAdmin ? events : events.filter(event => event.roomId !== "diretoria");
    return Response.json({
      me: publicMember(me),
      members: members.map(publicMember),
      team: team.map(publicMember),
      rooms: ROOM_DATA.map(r => roomList.find(item => item.id === r.id) || r),
      messages: chat.reverse().map(message => ({ ...message, sender: publicMember(message.sender) })),
      meetings: visibleEvents,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para continuar." }, { status: 401 });
    const body = await request.json();
    const patch: Partial<typeof users.$inferInsert> = { lastSeen: new Date() };
    for (const field of ["name", "role", "company"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || body[field].trim().length < 2 || body[field].trim().length > 80) return Response.json({ error: "Preencha nome, cargo e empresa com 2 a 80 caracteres." }, { status: 400 });
        patch[field] = body[field].trim();
      }
    }
    if (body.name !== undefined) {
      const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.isDemo, false), eq(users.name, patch.name as string))).limit(1);
      if (taken && taken.id !== me.id) return Response.json({ error: "Este nome já está em uso pela equipe. Escolha outro." }, { status: 409 });
    }
    if (body.avatar === "") patch.avatar = "";
    if (body.look !== undefined || body.avatarLook !== undefined) {
      patch.avatarLook = serializeLook(body.look ?? body.avatarLook);
    }
    if (body.color !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(body.color)) return Response.json({ error: "Escolha uma cor válida." }, { status: 400 });
      patch.color = body.color;
    }
    if (body.status !== undefined) {
      if (!["available", "busy", "away"].includes(body.status)) return Response.json({ error: "Status inválido." }, { status: 400 });
      patch.status = body.status;
    }
    if (body.roomId !== undefined) {
      if (!ROOM_DATA.some(room => room.id === body.roomId)) return Response.json({ error: "Ambiente não encontrado." }, { status: 400 });
      if (body.roomId === "diretoria" && !me.isAdmin) return Response.json({ error: "A Sala da diretoria é exclusiva para administradores." }, { status: 403 });
      patch.roomId = body.roomId;
    }
    if (typeof body.x === "number" && Number.isFinite(body.x)) patch.x = Math.max(10, Math.min(90, body.x));
    if (typeof body.y === "number" && Number.isFinite(body.y)) patch.y = Math.max(24, Math.min(87, body.y));
    if (typeof body.handRaised === "boolean") patch.handRaised = body.handRaised;
    if (body.action !== undefined && ["idle", "walk", "sit", "wave"].includes(body.action)) patch.action = body.action;
    if (body.direction !== undefined && ["dr", "dl", "ur", "ul"].includes(body.direction)) patch.direction = body.direction;
    if (body.sittingOn !== undefined) patch.sittingOn = typeof body.sittingOn === "string" ? body.sittingOn.slice(0, 60) : null;
    const [updated] = await db.update(users).set(patch).where(and(eq(users.id, me.id), eq(users.isDemo, false))).returning();
    return Response.json(publicMember(updated));
  } catch (error) { return fail(error); }
}
