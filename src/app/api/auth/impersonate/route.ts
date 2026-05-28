import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  setImpersonatorCookie,
  setSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { userId } = (await req.json()) as { userId?: string };
  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === admin.id)
    return NextResponse.json(
      { error: "You're already signed in as yourself." },
      { status: 400 }
    );

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  setImpersonatorCookie(admin.id);
  setSessionCookie(target.id);
  return NextResponse.json({ ok: true });
}
