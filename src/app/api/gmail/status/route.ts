import { NextResponse } from "next/server";
import { isConfigured, isConnected, readTokens } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stored = readTokens();
  return NextResponse.json({
    configured: isConfigured(),
    connected: isConnected(),
    email: stored?.email,
    lastSynced: stored?.lastSynced,
  });
}
