import { db } from "@/db";
import { leads, meetings, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { fail, getMember, seedWorkspace } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedWorkspace();
    const me = await getMember();
    if (!me) return Response.json({ error: "Entre no escritório para ver seus leads." }, { status: 401 });

    const result = await db
      .select({ lead: leads, meeting: meetings, owner: users })
      .from(leads)
      .leftJoin(meetings, eq(leads.meetingId, meetings.id))
      .innerJoin(users, eq(leads.ownerId, users.id))
      .where(eq(leads.ownerId, me.id))
      .orderBy(desc(leads.createdAt));

    return Response.json({
      leads: result.map(row => ({
        ...row.lead,
        meetingTitle: row.meeting?.title || null,
        ownerName: row.owner.name,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
