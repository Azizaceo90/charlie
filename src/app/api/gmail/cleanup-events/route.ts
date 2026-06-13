import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getCurrentUser } from "@/lib/auth";
import { oauthClient, readTokens } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time cleanup: delete the Google Calendar events this app created
// (tagged source=career-ops / career-ops-test). The dedicated importer's
// events are left untouched. Uses the existing Gmail token, which still holds
// the calendar scope even though the app no longer requests it.
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const stored = await readTokens();
  if (!stored)
    return NextResponse.json({ error: "Gmail not connected" }, { status: 401 });

  const client = oauthClient();
  client.setCredentials(stored.tokens);
  const cal = google.calendar({ version: "v3", auth: client });

  let deleted = 0;
  try {
    for (const tag of ["career-ops", "career-ops-test"]) {
      let pageToken: string | undefined = undefined;
      do {
        const res = (await cal.events.list({
          calendarId: "primary",
          privateExtendedProperty: [`source=${tag}`],
          showDeleted: false,
          maxResults: 250,
          pageToken,
        })) as {
          data: {
            items?: { id?: string | null }[];
            nextPageToken?: string | null;
          };
        };
        for (const ev of res.data.items ?? []) {
          if (!ev.id) continue;
          try {
            await cal.events.delete({ calendarId: "primary", eventId: ev.id });
            deleted += 1;
          } catch {
            /* skip ones that can't be deleted */
          }
        }
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
    }
  } catch (err) {
    return NextResponse.json(
      {
        deleted,
        error:
          err instanceof Error
            ? err.message
            : "Could not reach Google Calendar.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted });
}
