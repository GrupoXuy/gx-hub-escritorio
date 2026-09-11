import { db } from "@/db";
import { users, messages, meetings, invitations, signals } from "@/db/schema";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { fail, getMember, hashPassword, isHenriqueAdmin, validColor, validEmail, validPassword, validProfileText } from "@/lib/server";
import { serializeLook, defaultLookFor } from "@/lib/avatar";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para ver a equipe." }, { status: 401 });
    const team = await db.select().from(users).where(eq(users.isDemo, false)).orderBy(asc(users.name));
    if (isHenriqueAdmin(me)) {
      return Response.json({ team: team.map(({ passwordHash: _hash, accessToken: _token, ...safe }) => safe) });
    }
    return Response.json({ team: team.map(({ passwordHash: _hash, accessToken: _token, email: _email, ...safe }) => safe) });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para continuar." }, { status: 401 });
    if (!isHenriqueAdmin(me)) return Response.json({ error: "Apenas Henrique Senna pode cadastrar usuários." }, { status: 403 });
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!validProfileText(name) || !validProfileText(role) || !validProfileText(company)) return Response.json({ error: "Preencha nome, cargo e empresa com 2 a 80 caracteres." }, { status: 400 });
    if (!validEmail(email)) return Response.json({ error: "Informe um email válido." }, { status: 400 });
    if (!validPassword(password)) return Response.json({ error: "A senha precisa ter entre 8 e 200 caracteres." }, { status: 400 });
    if (body.color !== undefined && !validColor(body.color)) return Response.json({ error: "Escolha uma cor válida." }, { status: 400 });
    const gender = body.gender === "female" ? "female" : body.gender === "male" ? "male" : null;
    const [takenName] = await db.select({ id: users.id }).from(users).where(and(eq(users.isDemo, false), eq(users.name, name))).limit(1);
    if (takenName) return Response.json({ error: "Este nome já está cadastrado na equipe." }, { status: 409 });
    const [takenEmail] = await db.select({ id: users.id }).from(users).where(and(eq(users.isDemo, false), sql`lower(${users.email}) = ${email}`)).limit(1);
    if (takenEmail) return Response.json({ error: "Este email já está cadastrado na equipe." }, { status: 409 });
    const [member] = await db.insert(users).values({
      id: crypto.randomUUID(), name, role, company, avatar: "", color: body.color || "#c7a66e",
      avatarLook: serializeLook(body.look ?? defaultLookFor(gender)), gender,
      roomId: "recepcao", status: "available", x: 61, y: 73, isDemo: false, isAdmin: false,
      canAccessGroupSystem: body.canAccessGroupSystem === true, email, passwordHash: await hashPassword(password),
      accessToken: null, lastSeen: new Date(0),
    }).returning();
    const { passwordHash: _hash, accessToken: _token, ...safe } = member;
    return Response.json({ member: safe }, { status: 201 });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para continuar." }, { status: 401 });
    if (!isHenriqueAdmin(me)) return Response.json({ error: "Apenas Henrique Senna pode editar usuários." }, { status: 403 });
    const body = await request.json();
    const targetId = String(body.id || "");
    const [target] = await db.select().from(users).where(and(eq(users.id, targetId), eq(users.isDemo, false))).limit(1);
    if (!target) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    const patch: Partial<typeof users.$inferInsert> = {};
    for (const field of ["name", "role", "company"] as const) {
      if (body[field] !== undefined) {
        if (!validProfileText(body[field])) return Response.json({ error: "Preencha nome, cargo e empresa com 2 a 80 caracteres." }, { status: 400 });
        patch[field] = body[field].trim();
      }
    }
    if (patch.name && patch.name !== target.name) {
      const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.isDemo, false), eq(users.name, patch.name))).limit(1);
      if (taken) return Response.json({ error: "Este nome já está cadastrado na equipe." }, { status: 409 });
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!validEmail(email)) return Response.json({ error: "Informe um email válido." }, { status: 400 });
      const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.isDemo, false), sql`lower(${users.email}) = ${email}`)).limit(1);
      if (taken && taken.id !== target.id) return Response.json({ error: "Este email já está em uso." }, { status: 409 });
      patch.email = email;
    }
    if (body.password !== undefined) {
      if (!validPassword(body.password)) return Response.json({ error: "A senha precisa ter entre 8 e 200 caracteres." }, { status: 400 });
      patch.passwordHash = await hashPassword(body.password);
    }
    if (body.color !== undefined) {
      if (!validColor(body.color)) return Response.json({ error: "Escolha uma cor válida." }, { status: 400 });
      patch.color = body.color;
    }
    if (body.look !== undefined || body.avatarLook !== undefined) patch.avatarLook = serializeLook(body.look ?? body.avatarLook);
    if (body.gender !== undefined) patch.gender = body.gender === "female" ? "female" : body.gender === "male" ? "male" : null;
    if (typeof body.canAccessGroupSystem === "boolean") patch.canAccessGroupSystem = body.canAccessGroupSystem;
    // Nenhum usuário secundário pode virar administrador.
    patch.isAdmin = target.id === me.id;
    const [updated] = await db.update(users).set(patch).where(eq(users.id, targetId)).returning();
    const { passwordHash: _hash, accessToken: _token, ...safe } = updated;
    return Response.json({ member: safe });
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request) {
  try {
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para continuar." }, { status: 401 });
    if (!isHenriqueAdmin(me)) return Response.json({ error: "Apenas Henrique Senna pode remover usuários." }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id") || "";
    const [target] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isDemo, false))).limit(1);
    if (!target) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (target.id === me.id) return Response.json({ error: "Você não pode remover seu próprio usuário." }, { status: 400 });
    await db.transaction(async tx => {
      await tx.delete(signals).where(or(eq(signals.fromId, id), eq(signals.toId, id)));
      await tx.delete(invitations).where(eq(invitations.createdBy, id));
      await tx.delete(messages).where(eq(messages.senderId, id));
      await tx.delete(meetings).where(eq(meetings.organizerId, id));
      await tx.delete(users).where(eq(users.id, id));
    });
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}
