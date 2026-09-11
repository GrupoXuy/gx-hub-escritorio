import { db } from "@/db";
import { clientInvites, leads, meetings, rooms, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { fail, publicMember, randomToken, seedWorkspace, setGuestSession, validEmail, validProfileText } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";
import { serializeLook, defaultLookFor, lookFromId } from "@/lib/avatar";

export async function POST(request: Request) {
  try {
    await seedWorkspace();
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const gender = body.gender === "female" || body.gender === "male" ? body.gender : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (token.length < 20) return Response.json({ error: "Convite inválido." }, { status: 400 });
    if (!validProfileText(name, 2, 120)) return Response.json({ error: "Informe seu nome completo." }, { status: 400 });
    if (!gender) return Response.json({ error: "Escolha uma opção de sexo." }, { status: 400 });
    if (whatsapp.replace(/\D/g, "").length < 10) return Response.json({ error: "Informe um WhatsApp válido com DDD." }, { status: 400 });
    if (!validEmail(email)) return Response.json({ error: "Informe um email válido." }, { status: 400 });
    const result = await db.transaction(async tx => {
      const [row] = await tx.select({ invite: clientInvites, meeting: meetings, room: rooms }).from(clientInvites)
        .innerJoin(meetings, eq(meetings.id, clientInvites.meetingId))
        .innerJoin(rooms, eq(rooms.id, meetings.roomId))
        .where(and(eq(clientInvites.id, token), isNull(clientInvites.usedAt), gt(clientInvites.expiresAt, new Date())))
        .limit(1);
      if (!row) return { error: "Este convite já foi utilizado, expirou ou não existe." } as const;
      const [lead] = await tx.insert(leads).values({ name, gender, whatsapp, email, clientInviteId: row.invite.id, meetingId: row.meeting.id }).returning();
      const [guest] = await tx.insert(users).values({
        id: crypto.randomUUID(), name, role: "Cliente convidado", company: "Visitante",
        avatar: "", color: gender === "female" ? "#b29bc3" : "#7295a1",
        avatarLook: serializeLook({ ...defaultLookFor(gender), ...lookFromId(row.meeting.roomId + name) }), roomId: row.meeting.roomId,
        status: "available", x: 61, y: 47, isDemo: false, isAdmin: false,
        canAccessGroupSystem: false, isGuest: true, guestInviteId: row.invite.id,
        guestExpiresAt: row.invite.expiresAt, gender, email, accessToken: null, lastSeen: new Date(),
      }).returning();
      await tx.update(clientInvites).set({ usedAt: new Date(), guestUserId: guest.id }).where(eq(clientInvites.id, row.invite.id));
      return { lead, guest, meeting: row.meeting, room: row.room, expiresAt: row.invite.expiresAt } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: 410 });
    const seconds = Math.max(60, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000));
    await setGuestSession(result.guest.id, seconds);
    return Response.json({ ok: true, guest: publicMember(result.guest), meeting: result.meeting, room: result.room, expiresAt: result.expiresAt }, { status: 201 });
  } catch (error) { return fail(error); }
}
