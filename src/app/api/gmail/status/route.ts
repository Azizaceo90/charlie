import { NextResponse } from "next/server";
import { isConfigured, readTokens } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await readTokens();
  return NextResponse.json({
    configured: isConfigured(),
    connected: stored !== null,
    email: stored?.email,
    lastSynced: stored?.lastSynced,
  });
}
