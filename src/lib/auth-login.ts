import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { clientKey, emailEquals, fail, rateLimit, seedWorkspace, setSession, stripSecrets, validEmail, verifyPassword } from "@/lib/server";

/**
 * Login por email e senha.
 *
 * Compartilhado por `/api/auth/login` (canônica) e `/api/auth/password`
 * (mantida só por compatibilidade). O limite de tentativas usa um escopo
 * único, então as duas rotas contam juntas.
 */
export async function loginByEmail(request: Request) {
  try {
    await seedWorkspace();
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!validEmail(email) || !password) return Response.json({ error: "Informe seu email e senha pessoais." }, { status: 400 });
    if (!rateLimit(clientKey(request, "login")).ok) return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
    const [member] = await db.select().from(users).where(and(emailEquals(email), eq(users.isDemo, false))).limit(1);
    if (!member || !(await verifyPassword(password, member.passwordHash))) return Response.json({ error: "Email ou senha incorretos." }, { status: 401 });
    await db.update(users).set({ lastSeen: new Date(), status: member.status === "away" ? "available" : member.status }).where(eq(users.id, member.id));
    await setSession(member.id);
    return Response.json({ ok: true, me: stripSecrets({ ...member, accessToken: undefined, lastSeen: new Date() }) });
  } catch (error) {
    return fail(error);
  }
}
