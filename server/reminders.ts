// Daily review-reminder emails via Resend.
// Fully inert unless RESEND_API_KEY is set, so it is safe to deploy ahead of setup.
import crypto from "crypto";
import { db } from "./db";
import { users, flashcards } from "@shared/schema";
import { eq, isNull, lte, or, sql } from "drizzle-orm";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM || "nkae <reminders@nkae.study>";
const APP_URL = process.env.APP_URL || "https://nkae.study";

export function reminderToken(userId: string): string {
  const secret = process.env.SESSION_SECRET || "nkae-dev";
  return crypto.createHmac("sha256", secret).update(userId).digest("hex").slice(0, 32);
}

export async function disableReminders(userId: string): Promise<void> {
  await db.update(users).set({ remindersEnabled: false }).where(eq(users.id, userId));
}

function etNow(): { hour: number; dateKey: string } {
  const now = new Date();
  const hour = Number(
    now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false })
  );
  const dateKey = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
  return { hour, dateKey };
}

function emailHtml(firstName: string, count: number, unsubUrl: string): string {
  const cards = count === 1 ? "1 card is" : `${count} cards are`;
  return `
  <div style="background:#17141d;padding:40px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#1f1b28;border-radius:16px;padding:36px 32px;color:#faf8f4;">
      <p style="font-size:22px;font-weight:800;margin:0 0 24px;color:#faf8f4;">nkae<span style="color:#5b4be0;">.</span></p>
      <p style="font-size:18px;font-weight:700;margin:0 0 8px;">Hey ${firstName || "there"},</p>
      <p style="font-size:15px;line-height:1.6;color:#b2aec6;margin:0 0 24px;">
        ${cards} ready for review. This is the moment spaced repetition works best:
        right before you'd forget. It takes a few minutes.
      </p>
      <a href="${APP_URL}/flashcards"
         style="display:inline-block;background:#5b4be0;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:10px;">
        Review now
      </a>
      <p style="font-size:12px;color:#6f6a80;margin:32px 0 0;line-height:1.5;">
        You get at most one of these a day, only when cards are due.
        <a href="${unsubUrl}" style="color:#6f6a80;">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

export async function runReminderSweep(): Promise<{ sent: number }> {
  const { dateKey } = etNow();
  // Users with at least one due card
  const dueCounts = await db
    .select({ userId: flashcards.userId, count: sql<number>`count(*)::int` })
    .from(flashcards)
    .where(or(isNull(flashcards.nextReview), lte(flashcards.nextReview, new Date())))
    .groupBy(flashcards.userId);

  let sent = 0;
  for (const row of dueCounts) {
    if (!row.userId || !row.count) continue;
    const [user] = await db.select().from(users).where(eq(users.id, row.userId));
    if (!user || !user.email) continue;
    if (user.remindersEnabled === false) continue;
    const lastKey = user.lastReminderSentAt
      ? new Date(user.lastReminderSentAt).toLocaleDateString("en-CA", { timeZone: "America/New_York" })
      : null;
    if (lastKey === dateKey) continue; // already reminded today

    const unsubUrl = `${APP_URL}/api/reminders/unsubscribe?uid=${encodeURIComponent(user.id)}&sig=${reminderToken(user.id)}`;
    const ok = await sendEmail(
      user.email,
      `${row.count === 1 ? "1 card is" : `${row.count} cards are`} ready for review`,
      emailHtml(user.firstName || "", row.count, unsubUrl)
    );
    if (ok) {
      await db.update(users).set({ lastReminderSentAt: new Date() }).where(eq(users.id, user.id));
      sent++;
    }
  }
  return { sent };
}

export function startReminderScheduler(): void {
  if (!RESEND_API_KEY) {
    console.log("Review reminders disabled: RESEND_API_KEY not set");
    return;
  }
  console.log("Review reminders enabled: daily sweep between 9-11 AM ET");
  const tick = async () => {
    try {
      const { hour } = etNow();
      if (hour >= 9 && hour < 12) {
        const { sent } = await runReminderSweep();
        if (sent > 0) console.log(`Review reminders sent: ${sent}`);
      }
    } catch (e) {
      console.error("Reminder sweep failed:", e);
    }
  };
  setInterval(tick, 30 * 60 * 1000); // every 30 minutes
  void tick(); // and once at boot, in case we boot inside the window
}
