import { db } from "@/db";
import { clientInvites, meetings, rooms, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { fail, getMember, isHenriqueAdmin, seedWorkspace } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await seedWorkspace();
    const me = await getMember();
    if (!me || !isHenriqueAdmin(me)) return Response.json({ error: "Apenas Henrique Senna pode criar convites de clientes." }, { status: 403 });
    const body = await request.json();
    const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) return Response.json({ error: "Reunião não encontrada." }, { status: 404 });
    if (meeting.roomId === "diretoria") return Response.json({ error: "Convites de clientes não são permitidos na Sala da diretoria." }, { status: 403 });
    const end = new Date(new Date(meeting.startsAt).getTime() + meeting.duration * 60000);
    if (end.getTime() <= Date.now()) return Response.json({ error: "Só é possível convidar clientes para uma reunião futura." }, { status: 400 });
    const [invite] = await db.insert(clientInvites).values({ createdBy: me.id, meetingId, expiresAt: end }).returning();
    const room = ROOM_DATA.find(item => item.id === meeting.roomId);
    return Response.json({
      token: invite.id,
      meeting: { id: meeting.id, title: meeting.title, startsAt: meeting.startsAt, duration: meeting.duration, roomName: room?.name || meeting.roomId },
      expiresAt: invite.expiresAt,
    }, { status: 201 });
  } catch (error) { return fail(error); }
}

export async function GET(request: Request) {
  try {
    await seedWorkspace();
    const token = new URL(request.url).searchParams.get("token") || "";
    const [row] = await db.select({ invite: clientInvites, meeting: meetings, room: rooms }).from(clientInvites)
      .innerJoin(meetings, eq(meetings.id, clientInvites.meetingId))
      .innerJoin(rooms, eq(rooms.id, meetings.roomId))
      .where(and(eq(clientInvites.id, token), isNull(clientInvites.usedAt), gt(clientInvites.expiresAt, new Date())))
      .limit(1);
    if (!row || row.meeting.roomId === "diretoria") return Response.json({ error: "Este convite já foi utilizado, expirou ou não existe." }, { status: 410 });
    return Response.json({ valid: true, meeting: { id: row.meeting.id, title: row.meeting.title, description: row.meeting.description, startsAt: row.meeting.startsAt, duration: row.meeting.duration }, room: row.room, expiresAt: row.invite.expiresAt });
  } catch (error) { return fail(error); }
}
