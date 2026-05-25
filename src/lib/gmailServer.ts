import fs from "fs";
import path from "path";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import {
  classifyEmail,
  companyFromSender,
  roleFromSubject,
} from "./gmailClassify";
import { JobApplication } from "./types";

const TOKEN_PATH = path.join(process.cwd(), ".gmail-tokens.json");

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

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

interface StoredTokens {
  tokens: Record<string, unknown>;
  email?: string;
  lastSynced?: string;
}

export function readTokens(): StoredTokens | null {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8")) as StoredTokens;
  } catch {
    return null;
  }
}

export function writeTokens(data: StoredTokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function clearTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  } catch {
    /* ignore */
  }
}

export function isConnected(): boolean {
  return readTokens() !== null;
}

export function authUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

function header(headers: { name?: string | null; value?: string | null }[] | undefined, name: string): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/**
 * Fetches recent inbox messages, classifies the job-related ones, and returns
 * a de-duplicated list of applications (most recent status per company+role).
 */
export async function fetchApplications(): Promise<JobApplication[]> {
  const stored = readTokens();
  if (!stored) throw new Error("Gmail not connected");

  const client = oauthClient();
  client.setCredentials(stored.tokens);
  const gmail = google.gmail({ version: "v1", auth: client });

  const query =
    "newer_than:30d (application OR interview OR offer OR assessment OR applied OR candidate OR recruiter)";
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 80,
  });

  const messages = list.data.messages ?? [];
  const found: JobApplication[] = [];

  for (const m of messages) {
    if (!m.id) continue;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });
    const headers = msg.data.payload?.headers ?? [];
    const subject = header(headers, "Subject");
    const from = header(headers, "From");
    const snippet = msg.data.snippet ?? "";
    const status = classifyEmail({ subject, from, snippet });
    if (!status) continue;

    const dateMs = Number(msg.data.internalDate ?? Date.now());
    found.push({
      id: m.id,
      company: companyFromSender(from),
      role: roleFromSubject(subject),
      status,
      date: new Date(dateMs).toISOString(),
      source: "gmail",
      emailSubject: subject,
      emailFrom: from,
    });
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

  // persist lastSynced
  writeTokens({ ...stored, lastSynced: new Date().toISOString() });

  return Array.from(byKey.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
