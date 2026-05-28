import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await prisma.personalDoc.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.userId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.personalDoc.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
