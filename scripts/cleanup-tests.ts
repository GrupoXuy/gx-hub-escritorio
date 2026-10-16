import "dotenv/config";
import { db, pool } from "@/db";
import { users, messages, meetings, invitations, signals, leads } from "@/db/schema";
import { inArray, or } from "drizzle-orm";
import { existsSync, readFileSync } from "node:fs";
async function main() {
  if (!existsSync("artifacts/test-users.json") && !existsSync("artifacts/test-leads.json")) return;
  const ids = existsSync("artifacts/test-users.json")
    ? (JSON.parse(readFileSync("artifacts/test-users.json", "utf8")) as string[]).filter(id => id !== "henrique-senna")
    : [];
  const leadEmails = existsSync("artifacts/test-leads.json")
    ? JSON.parse(readFileSync("artifacts/test-leads.json", "utf8")) as string[]
    : [];
  if (!ids.length && !leadEmails.length) return;
  if (ids.some(id => !/^[a-f0-9-]{36}$/.test(id))) throw new Error("Invalid test user ID");
  if (leadEmails.some(email => typeof email !== "string" || !/^guest\.test\.\d+@example\.com$/.test(email))) throw new Error("Invalid synthetic test lead email");
  await db.transaction(async tx => {
    if (leadEmails.length) await tx.delete(leads).where(inArray(leads.email, leadEmails));
    if (ids.length) await tx.delete(signals).where(or(inArray(signals.fromId, ids), inArray(signals.toId, ids)));
    if (ids.length) await tx.delete(invitations).where(inArray(invitations.createdBy, ids));
    if (ids.length) await tx.delete(meetings).where(inArray(meetings.organizerId, ids));
    if (ids.length) await tx.delete(messages).where(inArray(messages.senderId, ids));
    if (ids.length) await tx.delete(users).where(inArray(users.id, ids));
  });
  console.log(`Removed ${ids.length} isolated test sessions and ${leadEmails.length} synthetic test leads.`);
}
main().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exitCode = 1; });
