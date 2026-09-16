import { db } from "@/db";
import { users, signals } from "@/db/schema";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { getCallMember, fail, clientKey, rateLimit } from "@/lib/server";

export async function POST(request: Request) {
  try {
    const me = await getCallMember();
    if (!me || !me.callRoom) return Response.json({ error: "Nenhuma chamada ativa." }, { status: 403 });
    const limit = rateLimit(clientKey(request, "webrtc-signal"), 120, 60_000);
    if (!limit.ok) return Response.json({ error: "Muitas solicitações de sinalização. Aguarde um momento." }, { status: 429, headers: { "Retry-After": "60" } });
    const body = await request.json();
    if (!body.payload || typeof body.payload !== "object" || JSON.stringify(body.payload).length > 64000 || (!body.payload.description && !body.payload.candidate)) return Response.json({ error: "Sinalização inválida." }, { status: 400 });
    const [recipient] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, String(body.toId)), eq(users.callRoom, me.callRoom), eq(users.isDemo, false), or(eq(users.isGuest, false), sql`${users.guestExpiresAt} > now()`), gt(users.lastSeen, new Date(Date.now() - 25000))));
    if (!recipient) return Response.json({ error: "A pessoa já saiu da sala." }, { status: 404 });
    await db.insert(signals).values({ fromId: me.id, toId: recipient.id, roomId: me.callRoom, payload: body.payload });
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}
