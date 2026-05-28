import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUERIES = ["Sales Development Representative", "Medical Coder"];

function base(req: NextRequest): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req.nextUrl.origin;
}

/**
 * Runs the predefined job searches and caches results to the JobCache table.
 * Triggered daily by a Vercel cron job, or manually by an admin.
 */
export async function GET(req: NextRequest) {
  // Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`. Also
  // allow an admin to trigger it manually.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const fromCron =
    isVercelCron || (Boolean(secret) && auth === `Bearer ${secret}`);
  if (!fromCron) {
    const me = await getCurrentUser();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const origin = base(req);
  const results: Record<string, { count: number; error?: string }> = {};

  for (const q of QUERIES) {
    try {
      const res = await fetch(
        `${origin}/api/jobs/search?q=${encodeURIComponent(q)}`,
        { headers: { "User-Agent": "career-ops-cron" } }
      );
      const data = (await res.json()) as { jobs?: unknown[]; error?: string };
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      // Roll yesterday's snapshot into previousData before writing today's.
      const existing = await prisma.jobCache.findUnique({
        where: { queryKey: q },
      });
      await prisma.jobCache.upsert({
        where: { queryKey: q },
        create: { queryKey: q, data: JSON.stringify(jobs) },
        update: {
          data: JSON.stringify(jobs),
          previousData: existing?.data ?? null,
        },
      });
      results[q] = { count: jobs.length, error: data.error };
    } catch (e) {
      results[q] = {
        count: 0,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  }

  return NextResponse.json({
    refreshedAt: new Date().toISOString(),
    results,
  });
}
