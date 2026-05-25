import { NextResponse } from "next/server";
import { authUrl, isConfigured } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gmail is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to your .env file. See .env.example.",
      },
      { status: 400 }
    );
  }
  return NextResponse.redirect(authUrl());
}
