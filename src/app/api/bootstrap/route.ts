import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
