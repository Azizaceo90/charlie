import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seedDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Auto-populate a fresh deployment so dashboards aren't empty on first load.
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) await seedDatabase(prisma);
  } catch {
    /* if seeding fails, fall through and return whatever exists */
  }

  const [users, applications, timeEntries, sops, contracts, applicants, listings] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.jobApplication.findMany({ orderBy: { date: "desc" } }),
      prisma.timeEntry.findMany({ orderBy: { clockIn: "desc" } }),
      prisma.sopDoc.findMany({ orderBy: { uploadedAt: "desc" } }),
      prisma.contract.findMany({ orderBy: { issuedAt: "desc" } }),
      prisma.applicant.findMany({ orderBy: { appliedAt: "desc" } }),
      prisma.jobListing.findMany({ orderBy: { postedAt: "desc" } }),
    ]);

  return NextResponse.json({
    users,
    applications,
    timeEntries,
    sops,
    contracts,
    applicants,
    listings,
  });
}
