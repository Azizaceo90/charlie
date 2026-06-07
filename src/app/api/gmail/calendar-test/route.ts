import { NextResponse } from "next/server";
import { google } from "googleapis";
import { hasCalendarScope, oauthClient, readTokens } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return runTest();
}

export async function POST() {
  return runTest();
}

async function runTest() {
  const stored = await readTokens();
  if (!stored) {
    return NextResponse.json(
      { ok: false, error: "Gmail not connected" },
      { status: 401 }
    );
  }

  const scopeRaw =
    typeof stored.tokens?.scope === "string" ? stored.tokens.scope : "";
  const scopes = scopeRaw.split(/\s+/).filter(Boolean);
  const calendarOk = await hasCalendarScope();

  if (!calendarOk) {
    return NextResponse.json({
      ok: false,
      stage: "scope",
      error:
        "Token doesn't include calendar.events scope. Reconnect Gmail and tick the Calendar checkbox.",
      grantedScopes: scopes,
    });
  }

  try {
    const client = oauthClient();
    client.setCredentials(stored.tokens);
    const cal = google.calendar({ version: "v3", auth: client });
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const res = await cal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: "Career Ops calendar test",
        description:
          "Test event from Career Ops to verify calendar write access. Safe to delete.",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        extendedProperties: {
          private: { source: "career-ops-test" },
        },
      },
    });
    return NextResponse.json({
      ok: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      grantedScopes: scopes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown calendar error";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (err as any)?.code ?? (err as any)?.response?.status;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (err as any)?.response?.data ?? null;
    return NextResponse.json({
      ok: false,
      stage: "api",
      error: msg,
      code,
      detail,
      grantedScopes: scopes,
    });
  }
}
