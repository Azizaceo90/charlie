import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";
import {
  classifyEmail,
  extractCompany,
  extractRole,
} from "./gmailClassify";
import { JobApplication } from "./types";

const TOKEN_ID = "default";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Best-effort date+time extraction from an interview email.
 *
 * - date **and** time → a 30-minute timed slot (`allDay: false`).
 * - date only (e.g. "availability on 6/11 or 6/12") → an all-day event on the
 *   first proposed date (`allDay: true`), so it lands on the right day even
 *   though the exact time still needs confirming.
 * - no date → null (caller uses a tentative fallback slot).
 */
export function parseInterviewSlot(
  text: string
): { start: Date; end: Date; allDay: boolean } | null {
  // 1) "November 25" / "Nov 25, 2025"
  const monthDate = text.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b\.?\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i
  );
  // 2) "11/25" or "11/25/2025" — no trailing \b so "6/5at 10am" still matches.
  const slashDate = text.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  // 3) ISO "2025-11-25"
  const isoDate = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  // Time formats: "2:00 PM", "2pm", "14:00"
  const timeAmPm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const time24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  if (monthDate) {
    month = MONTHS[monthDate[1].toLowerCase()];
    day = parseInt(monthDate[2], 10);
    year = monthDate[3] ? parseInt(monthDate[3], 10) : new Date().getFullYear();
  } else if (slashDate) {
    month = parseInt(slashDate[1], 10) - 1;
    day = parseInt(slashDate[2], 10);
    year = slashDate[3]
      ? parseInt(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3], 10)
      : new Date().getFullYear();
  } else if (isoDate) {
    year = parseInt(isoDate[1], 10);
    month = parseInt(isoDate[2], 10) - 1;
    day = parseInt(isoDate[3], 10);
  }

  if (year === null || month === null || day === null) return null;
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  // Dates/times are built with Date.UTC so the wall-clock numbers survive
  // regardless of the server timezone; the calendar event then carries an
  // explicit `timeZone`, so "10:30am" shows as 10:30am in CALENDAR_TZ — not
  // shifted by the server's UTC offset.

  // A date with no time → all-day event on that date (lands on the right day,
  // exact time to be confirmed with the sender).
  if (!timeAmPm && !time24) {
    const dayStart = new Date(Date.UTC(year, month, day));
    if (Number.isNaN(dayStart.getTime())) return null;
    return { start: dayStart, end: dayStart, allDay: true };
  }

  let hour = 9;
  let minute = 0;
  if (timeAmPm) {
    hour = parseInt(timeAmPm[1], 10);
    minute = timeAmPm[2] ? parseInt(timeAmPm[2], 10) : 0;
    if (/pm/i.test(timeAmPm[3]) && hour < 12) hour += 12;
    if (/am/i.test(timeAmPm[3]) && hour === 12) hour = 0;
  } else if (time24) {
    hour = parseInt(time24[1], 10);
    minute = parseInt(time24[2], 10);
  }

  const start = new Date(Date.UTC(year, month, day, hour, minute));
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 30 * 60 * 1000), allDay: false };
}

/** Timezone interview events are stamped in (override with CALENDAR_TZ). */
const CALENDAR_TZ = process.env.CALENDAR_TZ || "America/New_York";

/** Format the wall-clock (UTC-encoded) Date as YYYY-MM-DD for all-day events. */
function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format the wall-clock (UTC-encoded) Date as a local datetime string with no
 * offset (e.g. "2026-06-16T10:30:00"), to pair with an explicit timeZone. */
function localDateTime(d: Date): string {
  return `${ymd(d)}T${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}:00`;
}

/** Tentative reminder slot (next business day, 10:00 wall-clock) when no
 * date/time could be parsed. Encoded in UTC fields to match the formatters. */
function fallbackSlot(receivedAt: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(
      receivedAt.getUTCFullYear(),
      receivedAt.getUTCMonth(),
      receivedAt.getUTCDate() + 1,
      10,
      0
    )
  );
  // Skip to Monday if it lands on Saturday/Sunday.
  while (start.getUTCDay() === 0 || start.getUTCDay() === 6) {
    start.setUTCDate(start.getUTCDate() + 1);
  }
  return { start, end: new Date(start.getTime() + 30 * 60 * 1000) };
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

export function oauthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export interface StoredTokens {
  tokens: Record<string, unknown>;
  email?: string;
  lastSynced?: string;
}

export async function readTokens(): Promise<StoredTokens | null> {
  try {
    const row = await prisma.gmailToken.findUnique({ where: { id: TOKEN_ID } });
    if (!row) return null;
    return {
      tokens: JSON.parse(row.tokens) as Record<string, unknown>,
      email: row.email ?? undefined,
      lastSynced: row.lastSynced?.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function writeTokens(data: StoredTokens) {
  await prisma.gmailToken.upsert({
    where: { id: TOKEN_ID },
    create: {
      id: TOKEN_ID,
      tokens: JSON.stringify(data.tokens),
      email: data.email,
      lastSynced: data.lastSynced ? new Date(data.lastSynced) : null,
    },
    update: {
      tokens: JSON.stringify(data.tokens),
      email: data.email,
      lastSynced: data.lastSynced ? new Date(data.lastSynced) : undefined,
    },
  });
}

export async function clearTokens() {
  try {
    await prisma.gmailToken.deleteMany({ where: { id: TOKEN_ID } });
  } catch {
    /* ignore */
  }
}

export async function isConnected(): Promise<boolean> {
  return (await readTokens()) !== null;
}

/** True when the stored token includes the calendar.events scope. */
export async function hasCalendarScope(): Promise<boolean> {
  const stored = await readTokens();
  if (!stored) return false;
  const raw = stored.tokens?.scope;
  const scope = typeof raw === "string" ? raw : "";
  return scope.includes("https://www.googleapis.com/auth/calendar.events");
}

export function authUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GMAIL_SCOPES,
  });
}

function header(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string
): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/** Walk MIME parts and pull plain-text bodies (decoded from base64url). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(payload: any): string {
  if (!payload) return "";
  const parts: string[] = [];
  const walk = (p: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null }) => {
    if (!p) return;
    const mt = p.mimeType ?? "";
    const data = p.body?.data;
    if (data && (mt === "text/plain" || mt === "text/html")) {
      try {
        const buf = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
        let txt = buf.toString("utf8");
        if (mt === "text/html") txt = txt.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
        parts.push(txt);
      } catch {
        /* skip undecodable part */
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p.parts ?? []).forEach((child: any) => walk(child));
  };
  walk(payload);
  return parts.join("\n");
}

/**
 * Reads an entire interview thread — including the user's own replies — and
 * upserts a single Google Calendar event for it, keyed by the Gmail thread id.
 *
 * - Only schedules once the user has replied in the thread ("when I respond").
 * - Uses the most recent message that contains an explicit time as the agreed
 *   slot; falls back to the most recent proposed date (all-day), then to a
 *   tentative next-business-day slot.
 * - As the thread evolves (proposal → agreed time), the same event is patched
 *   in place rather than duplicated.
 */
async function upsertInterviewEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gmail: any,
  args: {
    threadId: string;
    company: string;
    subject: string;
    from: string;
    receivedAt: Date;
  }
): Promise<"created" | "updated" | "exists" | "skipped"> {
  // Pull the full thread (all messages, including the user's sent replies).
  let messages: { text: string; date: number; fromUser: boolean }[] = [];
  try {
    const thread = await gmail.users.threads.get({
      userId: "me",
      id: args.threadId,
      format: "full",
    });
    messages = (thread.data.messages ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => {
        const headers = m.payload?.headers ?? [];
        const subject = header(headers, "Subject");
        const body = extractPlainText(m.payload);
        const labels: string[] = m.labelIds ?? [];
        return {
          text: `${subject}\n${m.snippet ?? ""}\n${body}`,
          date: Number(m.internalDate ?? 0),
          fromUser: labels.includes("SENT"),
        };
      }
    );
  } catch {
    messages = [];
  }

  // Honor "when I respond": don't schedule until the user has replied.
  if (!messages.some((m) => m.fromUser)) return "skipped";

  // Newest message with an explicit time wins (the agreed slot); otherwise the
  // newest message that yields a date (proposed, all-day).
  const sorted = [...messages].sort((a, b) => b.date - a.date);
  let parsed: ReturnType<typeof parseInterviewSlot> = null;
  for (const m of sorted) {
    const s = parseInterviewSlot(m.text);
    if (s && !s.allDay) {
      parsed = s;
      break;
    }
    if (s && !parsed) parsed = s;
  }

  const slot = parsed ?? fallbackSlot(args.receivedAt);
  const allDay = parsed?.allDay ?? false;
  const timeKnown = parsed != null && !parsed.allDay;

  const summary = timeKnown
    ? `Interview: ${args.company}`
    : allDay
      ? `Interview: ${args.company} (confirm time)`
      : `Interview: ${args.company} (time TBD)`;

  const start = allDay
    ? { date: ymd(slot.start) }
    : { dateTime: localDateTime(slot.start), timeZone: CALENDAR_TZ };
  const end = allDay
    ? { date: ymd(new Date(slot.start.getTime() + 24 * 60 * 60 * 1000)) }
    : { dateTime: localDateTime(slot.end), timeZone: CALENDAR_TZ };

  // Stable key so re-syncs only patch when the slot actually changed.
  const slotKey = allDay ? `d:${ymd(slot.start)}` : `t:${localDateTime(slot.start)}`;

  const description =
    `${args.subject}\n\nFrom: ${args.from}\n\n` +
    (timeKnown
      ? "Scheduled from your email thread. Verify against the latest reply.\n\n"
      : allDay
        ? "Proposed date detected — confirm the exact time with the sender; this event updates automatically when a time is agreed.\n\n"
        : "No date/time detected yet — tentative slot. Update once you agree on a time.\n\n") +
    "Added automatically by Career Ops.";

  const requestBody = {
    summary,
    description,
    start,
    end,
    extendedProperties: {
      private: {
        gmailThreadId: args.threadId,
        source: "career-ops",
        tentative: timeKnown ? "false" : "true",
        slotKey,
      },
    },
  };

  const cal = google.calendar({ version: "v3", auth: authClient });
  const existing = await cal.events.list({
    calendarId: "primary",
    privateExtendedProperty: [`gmailThreadId=${args.threadId}`],
    maxResults: 1,
  });
  const ev = (existing.data.items ?? [])[0];
  if (ev?.id) {
    if (ev.extendedProperties?.private?.slotKey === slotKey) return "exists";
    await cal.events.patch({
      calendarId: "primary",
      eventId: ev.id,
      requestBody,
    });
    return "updated";
  }
  await cal.events.insert({ calendarId: "primary", requestBody });
  return "created";
}

export interface InterviewSyncMetrics {
  interviews: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsSkippedExisting: number;
  eventsSkippedNoReply: number;
  eventsErrored: number;
  lastCalendarError?: string;
  calendarAuthorized: boolean;
}

export interface SyncResult {
  applications: JobApplication[];
  metrics: InterviewSyncMetrics;
}

/**
 * Fetches recent inbox messages, classifies the job-related ones, and returns
 * a de-duplicated list of applications (most recent status per company+role)
 * along with metrics about interview-email calendar event creation.
 */
export async function fetchApplications(): Promise<SyncResult> {
  const stored = await readTokens();
  if (!stored) throw new Error("Gmail not connected");

  const client = oauthClient();
  client.setCredentials(stored.tokens);
  const gmail = google.gmail({ version: "v1", auth: client });

  // Tight query: drop promo/social inbox categories and require an
  // application-lifecycle phrase, so we pull real application mail — not alerts.
  const query = [
    "newer_than:2y",
    "-category:promotions",
    "-category:social",
    "-category:forums",
    '("thank you for applying" OR "thanks for applying" OR "application received"',
    'OR "we received your application" OR "your application to" OR "your application for"',
    'OR "application was sent" OR "application has been received"',
    'OR "interview invitation" OR "invite you to interview" OR "schedule your interview"',
    'OR "your interview" OR "the interview" OR "interview will be" OR "interview is scheduled"',
    'OR "zoom meeting" OR "zoom link" OR "join zoom" OR "google meet" OR "meet.google.com"',
    'OR "calendar invite" OR "calendar invitation"',
    'OR "look forward to meeting" OR "look forward to speaking" OR "looking forward to meeting" OR "looking forward to speaking"',
    'OR "phone screen" OR "online assessment" OR "coding challenge" OR "take-home"',
    'OR "pleased to offer" OR "offer of employment" OR "offer letter"',
    'OR "regret to inform" OR "move forward with your application")',
  ].join(" ");
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 250,
  });

  const ids = (list.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id));
  const found: JobApplication[] = [];
  const calendarAuthorized = await hasCalendarScope();
  const metrics: InterviewSyncMetrics = {
    interviews: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsSkippedExisting: 0,
    eventsSkippedNoReply: 0,
    eventsErrored: 0,
    calendarAuthorized,
  };
  // Each interview thread is handled once even if several of its messages match.
  const processedThreads = new Set<string>();

  // Fetch message metadata in parallel batches to stay within the time limit.
  const BATCH = 20;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const msgs = await Promise.all(
      batch.map((id) =>
        gmail.users.messages
          .get({
            userId: "me",
            id,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "Date"],
          })
          .then((r) => r.data)
          .catch(() => null)
      )
    );
    for (const data of msgs) {
      if (!data?.id) continue;
      const headers = data.payload?.headers ?? [];
      const subject = header(headers, "Subject");
      const from = header(headers, "From");
      const snippet = data.snippet ?? "";
      const status = classifyEmail({ subject, from, snippet });
      if (!status) continue;

      const dateMs = Number(data.internalDate ?? Date.now());
      const company = extractCompany(subject, from);
      found.push({
        id: data.id,
        company,
        role: extractRole(subject) || "Role not specified",
        status,
        date: new Date(dateMs).toISOString(),
        source: "gmail",
        emailSubject: subject,
        emailFrom: from,
      });

      // If it's an interview email, read the whole thread (incl. the user's
      // replies) and upsert a single calendar event for it.
      if (status === "interview") {
        metrics.interviews += 1;
        const threadId = data.threadId ?? data.id;
        if (!calendarAuthorized) {
          metrics.eventsErrored += 1;
          metrics.lastCalendarError =
            "Calendar permission not granted. Disconnect and reconnect Gmail and approve the calendar access on the consent screen.";
        } else if (!processedThreads.has(threadId)) {
          processedThreads.add(threadId);
          try {
            const outcome = await upsertInterviewEvent(client, gmail, {
              threadId,
              company,
              subject,
              from,
              receivedAt: new Date(dateMs),
            });
            if (outcome === "created") metrics.eventsCreated += 1;
            else if (outcome === "updated") metrics.eventsUpdated += 1;
            else if (outcome === "skipped") metrics.eventsSkippedNoReply += 1;
            else metrics.eventsSkippedExisting += 1;
          } catch (err) {
            metrics.eventsErrored += 1;
            metrics.lastCalendarError =
              err instanceof Error ? err.message : "Calendar API error";
          }
        }
      }
    }
  }

  // de-dupe by company+role, keeping the most advanced/recent status
  const rank: Record<string, number> = {
    applied: 1,
    assessment: 2,
    interview: 3,
    offer: 4,
    rejected: 5,
  };
  const byKey = new Map<string, JobApplication>();
  for (const app of found) {
    const key = `${app.company.toLowerCase()}|${app.role.toLowerCase()}`;
    const existing = byKey.get(key);
    if (
      !existing ||
      rank[app.status] > rank[existing.status] ||
      (rank[app.status] === rank[existing.status] && app.date > existing.date)
    ) {
      byKey.set(key, app);
    }
  }

  await writeTokens({ ...stored, lastSynced: new Date().toISOString() });

  const applications = Array.from(byKey.values()).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
  return { applications, metrics };
}
