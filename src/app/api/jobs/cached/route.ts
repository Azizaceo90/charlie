import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedJob {
  company?: string;
  title?: string;
  [k: string]: unknown;
}

function key(j: CachedJob): string {
  return `${(j.company ?? "").toLowerCase().trim()}|${(j.title ?? "")
    .toLowerCase()
    .trim()}`;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ jobs: null });
  const row = await prisma.jobCache.findUnique({ where: { queryKey: q } });
  if (!row) return NextResponse.json({ jobs: null });

  let current: CachedJob[] = [];
  let previous: CachedJob[] = [];
  try {
    current = JSON.parse(row.data) as CachedJob[];
  } catch {
    /* ignore */
  }
  if (row.previousData) {
    try {
      previous = JSON.parse(row.previousData) as CachedJob[];
    } catch {
      /* ignore */
    }
  }

  // Mark jobs that weren't in yesterday's snapshot. If we don't have a
  // previous snapshot yet, don't flag anything (avoids a wall of NEW badges
  // on the first cron run).
  const hasPrevious = previous.length > 0;
  const previousKeys = new Set(previous.map(key));
  const enriched = current.map((j) => ({
    ...j,
    isNew: hasPrevious && !previousKeys.has(key(j)),
  }));

  return NextResponse.json({
    jobs: enriched,
    fetchedAt: row.fetchedAt.toISOString(),
  });
}
