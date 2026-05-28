import { NextResponse } from "next/server";
import {
  clearImpersonatorCookie,
  getImpersonator,
  setSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await getImpersonator();
  if (!admin) {
    return NextResponse.json(
      { error: "Not impersonating." },
      { status: 400 }
    );
  }
  setSessionCookie(admin.id);
  clearImpersonatorCookie();
  return NextResponse.json({ ok: true });
}
