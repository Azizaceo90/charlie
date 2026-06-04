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

/** Best-effort date+time extraction from an interview email. */
export function parseInterviewSlot(
  text: string
): { start: Date; end: Date } | null {
  const dateMatch = text.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b\.?\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i
  );
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!dateMatch || !timeMatch) return null;
  const month = MONTHS[dateMatch[1].toLowerCase()];
  if (month === undefined) return null;
  const day = parseInt(dateMatch[2], 10);
  const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  if (/pm/i.test(timeMatch[3]) && hour < 12) hour += 12;
  if (/am/i.test(timeMatch[3]) && hour === 12) hour = 0;
  const start = new Date(year, month, day, hour, minute);
  if (Number.isNaN(start.getTime())) return null;
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

export function authUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
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

/**
 * Creates a Google Calendar event for a detected interview email. Idempotent:
 * skips if an event already exists with the same Gmail message id tag.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureInterviewEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authClient: any,
  args: {
    messageId: string;
    company: string;
    subject: string;
    from: string;
    snippet: string;
  }
): Promise<void> {
  const cal = google.calendar({ version: "v3", auth: authClient });
  // De-dup: any existing event tagged with this message id?
  const existing = await cal.events.list({
    calendarId: "primary",
    privateExtendedProperty: [`gmailMsgId=${args.messageId}`],
    maxResults: 1,
  });
  if ((existing.data.items ?? []).length > 0) return;

  const slot = parseInterviewSlot(`${args.subject}\n${args.snippet}`);
  if (!slot) return; // no parseable date/time → don't guess

  await cal.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `Interview: ${args.company}`,
      description: `${args.subject}\n\nFrom: ${args.from}\n\nAdded automatically by Career Ops.`,
      start: { dateTime: slot.start.toISOString() },
      end: { dateTime: slot.end.toISOString() },
      extendedProperties: {
        private: { gmailMsgId: args.messageId, source: "career-ops" },
      },
    },
  });
}

/**
 * Fetches recent inbox messages, classifies the job-related ones, and returns
 * a de-duplicated list of applications (most recent status per company+role).
 */
export async function fetchApplications(): Promise<JobApplication[]> {
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

      // If it's an interview email, try to auto-create a Google Calendar
      // event at the parsed date/time (idempotent by gmail message id).
      if (status === "interview") {
        try {
          await ensureInterviewEvent(client, {
            messageId: data.id,
            company,
            subject,
            from,
            snippet,
          });
        } catch {
          /* don't fail the sync if calendar isn't authorized */
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

  return Array.from(byKey.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
