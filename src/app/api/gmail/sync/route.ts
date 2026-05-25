import { NextResponse } from "next/server";
import { fetchApplications, isConnected } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isConnected()) {
    return NextResponse.json(
      { error: "Gmail not connected" },
      { status: 401 }
    );
  }
  try {
    const applications = await fetchApplications();
    return NextResponse.json({ applications, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
