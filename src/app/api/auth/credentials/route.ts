import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { clientKey, emailEquals, fail, getMember, hashPassword, rateLimit, seedWorkspace, validEmail, validPassword } from "@/lib/server";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    await seedWorkspace();
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para configurar seu acesso." }, { status: 401 });
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!validEmail(email)) return Response.json({ error: "Informe um email válido." }, { status: 400 });
    if (!validPassword(password)) return Response.json({ error: "A senha deve ter ao menos 8 caracteres." }, { status: 400 });
    if (!rateLimit(clientKey(request, "credentials")).ok) return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
    const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.isDemo, false), emailEquals(email))).limit(1);
    if (taken && taken.id !== me.id) return Response.json({ error: "Este email já está em uso." }, { status: 409 });
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ email, passwordHash }).where(eq(users.id, me.id));
    return Response.json({ ok: true, email });
  } catch (error) {
    return fail(error);
  }
}
