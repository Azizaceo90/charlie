import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ jobs: null });
  const row = await prisma.jobCache.findUnique({ where: { queryKey: q } });
  if (!row) return NextResponse.json({ jobs: null });
  let jobs: unknown[] = [];
  try {
    jobs = JSON.parse(row.data);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ jobs, fetchedAt: row.fetchedAt.toISOString() });
}
