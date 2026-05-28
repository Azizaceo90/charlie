import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seedDb";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded(prisma);

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, applications, timeEntries, sops, contracts, applicants, listings, notifications] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          avatarColor: true,
        },
      }),
      prisma.jobApplication.findMany({ orderBy: { date: "desc" } }),
      prisma.timeEntry.findMany({ orderBy: { clockIn: "desc" } }),
      prisma.sopDoc.findMany({ orderBy: { uploadedAt: "desc" } }),
      prisma.contract.findMany({ orderBy: { issuedAt: "desc" } }),
      prisma.applicant.findMany({ orderBy: { appliedAt: "desc" } }),
      prisma.jobListing.findMany({ orderBy: { postedAt: "desc" } }),
      prisma.notification.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  return NextResponse.json({
    users,
    applications,
    timeEntries,
    sops,
    contracts,
    applicants,
    listings,
    notifications,
  });
}
