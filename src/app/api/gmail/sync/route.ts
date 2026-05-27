import { NextResponse } from "next/server";
import { fetchApplications, isConnected } from "@/lib/gmailServer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 401 });
  }
  try {
    const fetched = await fetchApplications();

    // Replace previously synced Gmail rows; keep manual entries untouched.
    await prisma.jobApplication.deleteMany({ where: { source: "gmail" } });
    for (const a of fetched) {
      await prisma.jobApplication.create({
        data: {
          company: a.company,
          role: a.role,
          status: a.status,
          date: new Date(a.date),
          source: "gmail",
          emailSubject: a.emailSubject,
          emailFrom: a.emailFrom,
          location: a.location,
        },
      });
    }

    const applications = await prisma.jobApplication.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json({
      applications,
      synced: fetched.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
