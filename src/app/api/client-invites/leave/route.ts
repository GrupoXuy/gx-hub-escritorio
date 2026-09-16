import { db } from "@/db";
import { clientInvites, signals, users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { clearGuestSession, fail } from "@/lib/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const jarId = (await import("next/headers")).cookies;
    const jar = await jarId();
    const guestId = jar.get("gx_guest_session")?.value;

    if (guestId) {
      const [guest] = await db.select({ id: users.id, inviteId: users.guestInviteId }).from(users)
        .where(and(eq(users.id, guestId), eq(users.isGuest, true))).limit(1);

      if (guest) {
        await db.update(users).set({ guestExpiresAt: new Date(), callRoom: null, micEnabled: false, cameraEnabled: false })
          .where(eq(users.id, guest.id));
        await db.delete(signals).where(or(eq(signals.fromId, guest.id), eq(signals.toId, guest.id)));

        // O token só pode invalidar o convite que pertence à sessão atual.
        if (token && token === guest.inviteId) {
          await db.update(clientInvites).set({ usedAt: new Date() })
            .where(and(eq(clientInvites.id, token), eq(clientInvites.guestUserId, guest.id)));
        }
      }
    }

    await clearGuestSession();
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}
