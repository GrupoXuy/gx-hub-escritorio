import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, latencyMs: Date.now() - started });
  } catch {
    return Response.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
