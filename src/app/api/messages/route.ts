import { db } from "@/db";
import { messages } from "@/db/schema";
import { getMember, isHenriqueAdmin, fail, publicMember } from "@/lib/server";
import { ROOM_DATA } from "@/lib/workspace";

export async function DELETE() {
  try {
    const me = await getMember();
    if (!me || !isHenriqueAdmin(me)) return Response.json({ error: "Apenas Henrique Senna pode apagar o histórico do chat." }, { status: 403 });
    await db.delete(messages);
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para conversar." }, { status: 401 });
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const roomId = body.roomId || "geral";
    if (!content || content.length > 2000) return Response.json({ error: "Escreva uma mensagem de até 2.000 caracteres." }, { status: 400 });
    if (roomId !== "geral" && !ROOM_DATA.some(r => r.id === roomId)) return Response.json({ error: "Conversa não encontrada." }, { status: 400 });
    const [message] = await db.insert(messages).values({ senderId: me.id, content, roomId }).returning();
    // Nunca devolva credenciais/dados privados do usuário junto da mensagem.
    return Response.json({ ...message, sender: publicMember(me) }, { status: 201 });
  } catch (error) { return fail(error); }
}
