import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, asc, eq, gt, or } from "drizzle-orm";
import { fail, publicMember, seedWorkspace } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/**
 * Escritório para convidados de link de reunião (?cliente=…).
 *
 * Endpoint de propósito próprio: em vez de liberar /api/workspace para
 * convidados — aquele devolve chat, equipe, reuniões e leads, e o convite diz
 * que dá acesso só à reunião — este route devolve APENAS me, members e rooms:
 * o mínimo para o convidado ver o mapa e mover o próprio avatar enquanto a
 * chamada fica minimizada.
 *
 * Autenticação: exclusivamente o cookie de convidado (gx_guest_session). A
 * sessão da equipe (gx_session) NÃO autentica aqui — membro logado não vira
 * convidado por acaso e não lê este endpoint. Nenhum campo sensível (email,
 * token, hash) sai do banco: tudo passa por publicMember.
 */
async function getGuest() {
  const jar = await cookies();
  const id = jar.get("gx_guest_session")?.value;
  if (!id) return null;
  const [guest] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isGuest, true), gt(users.guestExpiresAt, new Date()))).limit(1);
  return guest || null;
}

const unauthorized = () => Response.json({ error: "Sessão de convidado necessária." }, { status: 401, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  try {
    await seedWorkspace();
    const guest = await getGuest();
    if (!guest) return unauthorized();
    // O GET também é o batimento de presença na vista do escritório.
    const [me] = await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, guest.id)).returning();
    const members = await db.select().from(users).where(and(eq(users.isDemo, false), or(gt(users.lastSeen, new Date(Date.now() - 45000)), eq(users.id, me.id)))).orderBy(asc(users.name));
    return Response.json({
      me: publicMember(me),
      members: members.map(publicMember),
      rooms: ROOM_DATA,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request) {
  try {
    const guest = await getGuest();
    if (!guest) return unauthorized();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return Response.json({ error: "Pedido inválido." }, { status: 400 });
    const patch: Partial<typeof users.$inferInsert> = { lastSeen: new Date() };
    // Nome, email, empresa, cor, avatar e afins são deliberadamente ignorados:
    // o convite dá acesso à reunião, não à edição de perfil.
    if (body.roomId !== undefined) {
      if (typeof body.roomId !== "string" || body.roomId === "diretoria" || !ROOM_DATA.some(room => room.id === body.roomId)) {
        return Response.json({ error: "Ambiente não encontrado para convidados." }, { status: 400 });
      }
      patch.roomId = body.roomId;
    }
    // Coordenada fora da faixa não é erro: é limitada aos limites do mapa.
    if (typeof body.x === "number" && Number.isFinite(body.x)) patch.x = Math.max(10, Math.min(90, body.x));
    if (typeof body.y === "number" && Number.isFinite(body.y)) patch.y = Math.max(24, Math.min(87, body.y));
    if (body.action !== undefined && ["idle", "walk", "sit", "wave"].includes(body.action)) patch.action = body.action;
    if (body.direction !== undefined && ["dr", "dl", "ur", "ul"].includes(body.direction)) patch.direction = body.direction;
    if (typeof body.handRaised === "boolean") patch.handRaised = body.handRaised;
    if (body.status !== undefined) {
      if (!["available", "busy", "away"].includes(body.status)) return Response.json({ error: "Status inválido." }, { status: 400 });
      patch.status = body.status;
    }
    if (body.sittingOn !== undefined) {
      patch.sittingOn = typeof body.sittingOn === "string" ? body.sittingOn.slice(0, 60) : null;
      if (patch.sittingOn) {
        const [occupant] = await db.select({ id: users.id }).from(users).where(and(
          eq(users.sittingOn, patch.sittingOn),
          gt(users.lastSeen, new Date(Date.now() - 90000)),
        )).limit(1);
        if (occupant && occupant.id !== guest.id) {
          return Response.json({ error: "Este assento já está ocupado." }, { status: 409 });
        }
      }
    }
    const [updated] = await db.update(users).set(patch).where(and(eq(users.id, guest.id), eq(users.isGuest, true))).returning();
    if (!updated) return unauthorized();
    return Response.json(publicMember(updated), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}
