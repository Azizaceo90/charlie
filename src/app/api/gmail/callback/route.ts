import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { oauthClient, writeTokens } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/applications?gmail=error`);
  }

  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    let email: string | undefined;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const me = await oauth2.userinfo.get();
      email = me.data.email ?? undefined;
    } catch {
      /* email lookup is best-effort */
    }

    await writeTokens({ tokens: tokens as Record<string, unknown>, email });
    return NextResponse.redirect(`${origin}/applications?gmail=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/applications?gmail=error`);
  }
}
