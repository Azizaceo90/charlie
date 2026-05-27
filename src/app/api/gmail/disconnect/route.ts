import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearTokens();
  return NextResponse.json({ ok: true });
}
