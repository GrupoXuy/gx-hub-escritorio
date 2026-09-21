import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emailEquals, fail, getMember, seedWorkspace, validEmail, validProfileText } from "@/lib/server";

export const dynamic = "force-dynamic";

function radarAuthorized(request: Request) {
  const expected = process.env.GX_RADAR_API_KEY?.trim();
  if (!expected) return false;
  const header = request.headers.get("x-gx-radar-api-key")?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  return header === expected || bearer === expected;
}

function textOrEmpty(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    await seedWorkspace();
    if (!radarAuthorized(request)) {
      return Response.json({ error: "GX Radar não autorizado." }, { status: 401 });
    }

    const body = await request.json();
    const ownerId = textOrEmpty(body.ownerId || body.userId || body.assignedTo || body.assignedToUserId, 120);
    const ownerEmail = textOrEmpty(body.ownerEmail || body.userEmail || body.assignedToEmail, 120).toLowerCase();

    let owner = null;
    if (ownerId) {
      [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
    } else if (ownerEmail && validEmail(ownerEmail)) {
      [owner] = await db.select().from(users).where(emailEquals(ownerEmail)).limit(1);
    }
    if (!owner || owner.isDemo || owner.isGuest) {
      return Response.json({ error: "Informe um usuário responsável válido para este lead." }, { status: 400 });
    }

    const name = textOrEmpty(body.name || body.contactName || body.contact?.name, 120);
    const companyName = textOrEmpty(body.companyName || body.company || body.company?.name, 160);
    const whatsapp = textOrEmpty(body.whatsapp || body.phone || body.mobile || body.contact?.whatsapp, 80);
    const email = textOrEmpty(body.email || body.contactEmail || body.contact?.email, 120).toLowerCase();
    const instagram = textOrEmpty(body.instagram || body.instagramUrl || body.contact?.instagram, 240);
    const website = textOrEmpty(body.website || body.site || body.siteUrl || body.websiteUrl || body.contact?.website, 240);

    if (!validProfileText(name, 2, 120)) {
      return Response.json({ error: "Informe o nome do lead." }, { status: 400 });
    }
    if (!whatsapp && !email) {
      return Response.json({ error: "Informe WhatsApp ou email do lead." }, { status: 400 });
    }
    if (email && !validEmail(email)) {
      return Response.json({ error: "Email do lead inválido." }, { status: 400 });
    }

    const [lead] = await db.insert(leads).values({
      ownerId: owner.id,
      source: "gx-radar",
      name,
      companyName,
      gender: textOrEmpty(body.gender, 20),
      whatsapp,
      email,
      instagram: instagram || null,
      website: website || null,
      clientInviteId: null,
      meetingId: null,
    }).returning();

    return Response.json({
      ok: true,
      lead: {
        id: lead.id,
        ownerId: lead.ownerId,
        source: lead.source,
        name: lead.name,
        companyName: lead.companyName,
        whatsapp: lead.whatsapp,
        email: lead.email,
        instagram: lead.instagram,
        website: lead.website,
        createdAt: lead.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
