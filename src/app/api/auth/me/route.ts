import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seedDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded(prisma);
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ? publicUser(user) : null });
}
