import { db } from "@/db";
import { meetings, clientInvites, leads, users } from "@/db/schema";
import { and, eq, gt, lt, sql, inArray, or } from "drizzle-orm";
import { getMember, fail, isHenriqueAdmin } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";
export async function POST(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para agendar." }, { status: 401 });
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
    const startsAt = new Date(body.startsAt);
    const duration = Number(body.duration);
    if (title.length < 3 || title.length > 100) return Response.json({ error: "O título deve ter entre 3 e 100 caracteres." }, { status: 400 });
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60000) return Response.json({ error: "Escolha uma data e um horário futuros." }, { status: 400 });
    if (![15, 30, 45, 60, 90, 120].includes(duration)) return Response.json({ error: "Selecione uma duração válida." }, { status: 400 });
    if (!ROOM_DATA.some(r => r.id === body.roomId)) return Response.json({ error: "Escolha uma sala disponível." }, { status: 400 });
    if (body.roomId === "diretoria" && !isHenriqueAdmin(me)) return Response.json({ error: "A Sala da diretoria é exclusiva para Henrique Senna." }, { status: 403 });
    const end = new Date(startsAt.getTime() + duration * 60000);
    const result = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${body.roomId}))`);
      const overlaps = await tx.select().from(meetings).where(and(eq(meetings.roomId, body.roomId), lt(meetings.startsAt, end), gt(sql`${meetings.startsAt} + ${meetings.duration} * interval '1 minute'`, startsAt)));
      if (overlaps.length) return null;
      const [meeting] = await tx.insert(meetings).values({ title, description, roomId: body.roomId, startsAt, duration, organizerId: me.id }).returning();
      return meeting;
    });
    if (!result) return Response.json({ error: "Essa sala já tem uma reunião nesse horário. Escolha outro horário ou ambiente." }, { status: 409 });
    return Response.json(result, { status: 201 });
  } catch (error) { return fail(error); }
}
export async function DELETE(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Sessão não encontrada." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Informe a reunião." }, { status: 400 });
    const [owned] = await db.select({ id: meetings.id }).from(meetings).where(and(eq(meetings.id, id), eq(meetings.organizerId, me.id))).limit(1);
    if (!owned) return Response.json({ error: "Apenas quem organizou pode cancelar a reunião." }, { status: 403 });
    await db.transaction(async tx => {
      const invites = await tx.select({ id: clientInvites.id, guestUserId: clientInvites.guestUserId }).from(clientInvites).where(eq(clientInvites.meetingId, id));
      const inviteIds = invites.map(item => item.id);
      const guestIds = invites.map(item => item.guestUserId).filter((value): value is string => Boolean(value));
      // Leads are CRM records, not disposable meeting artifacts. Detach them before
      // removing the meeting/invite so contact details survive cancellation.
      const affectedLeads = inviteIds.length
        ? or(eq(leads.meetingId, id), inArray(leads.clientInviteId, inviteIds))
        : eq(leads.meetingId, id);
      await tx.update(leads).set({ meetingId: null, clientInviteId: null }).where(affectedLeads);
      if (inviteIds.length) await tx.delete(clientInvites).where(inArray(clientInvites.id, inviteIds));
      if (guestIds.length) await tx.delete(users).where(inArray(users.id, guestIds));
      await tx.delete(meetings).where(eq(meetings.id, id));
    });
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}
